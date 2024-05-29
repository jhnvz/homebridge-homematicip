import * as os from 'os';
import * as crypto from 'crypto';
import fetch from 'node-fetch';
import WebSocket from 'ws';
import { PLUGIN_NAME, PLUGIN_VERSION } from './settings.js';
import Bottleneck from 'bottleneck';
export class HmIPConnector {
    accessPoint;
    authToken;
    clientAuthToken;
    pin;
    clientCharacteristics;
    log;
    urlREST;
    urlWebSocket;
    wsClosed = false;
    wsPingIntervalMillis = 5000;
    wsPingIntervalId = null;
    wsReconnectIntervalId = null;
    wsReconnectIntervalMillis = 10000;
    ws = null;
    limiter;
    limiterDepleted = false;
    constructor(log, accessPoint, authToken, pin) {
        this.log = log;
        this.authToken = authToken;
        this.pin = pin;
        this.accessPoint = accessPoint ? accessPoint.replace(/[^a-fA-F0-9 ]/g, '').toUpperCase() : '';
        this.clientCharacteristics = {
            'clientCharacteristics': {
                'apiVersion': '10',
                'applicationIdentifier': PLUGIN_NAME,
                'applicationVersion': PLUGIN_VERSION,
                'deviceManufacturer': 'none',
                'deviceType': 'Computer',
                'language': 'de_DE',
                'osType': os.type(),
                'osVersion': os.release(),
            },
            'id': this.accessPoint,
        };
        this.clientAuthToken = crypto
            .createHash('sha512')
            .setEncoding('utf-8')
            .update(this.accessPoint + 'jiLpVitHvWnIGD1yo7MA')
            .digest('hex')
            .toUpperCase();
        this.limiter = new Bottleneck({
            maxConcurrent: 1,
            minTime: 100,
            reservoir: 10,
            reservoirIncreaseInterval: 1000,
            reservoirIncreaseAmount: 1,
            reservoirIncreaseMaximum: 10,
            highWater: 120, // = 2 * 60s / (interval / 1000ms / amount)
            strategy: Bottleneck.strategy.LEAK,
        });
        this.limiter.on('dropped', () => {
            this.log.warn('High water mark reached, dropping oldest job with lowest priority');
        });
        this.limiter.on('depleted', (empty) => {
            if (!this.limiterDepleted && !empty) {
                this.limiterDepleted = true;
                this.log.info('Limiter depleted, throttling requests');
            }
        });
        this.limiter.on('empty', () => {
            if (this.limiterDepleted) {
                this.log.info('Limiter empty again, requests are no longer throttled');
                this.limiterDepleted = false;
            }
        });
    }
    isReadyForUse() {
        return this.accessPoint && this.authToken;
    }
    isReadyForPairing() {
        return this.accessPoint;
    }
    async init() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'VERSION': '12',
            'AUTHTOKEN': '',
            'CLIENTAUTH': this.clientAuthToken,
        };
        const response = await fetch('https://lookup.homematic.com:48335/getHost', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(this.clientCharacteristics),
        });
        const result = await response.json();
        if (response.status !== 200 || !result.urlREST || !result.urlWebSocket) {
            this.log.error('Cannot lookup device: request=' + JSON.stringify(this.clientCharacteristics)
                + ', headers=' + JSON.stringify(headers) + ', code='
                + response.status + ', message=' + response.statusText + ', json=' + JSON.stringify(result));
            return false;
        }
        this.urlREST = result.urlREST;
        this.urlWebSocket = result.urlWebSocket;
        return true;
    }
    async apiCall(path, _body, priority = 5) {
        return this._apiCall(true, true, path, _body, priority);
    }
    async _apiCall(addTokens, logError, path, _body, priority = 5) {
        const url = `${this.urlREST}/hmip/${path}`;
        const headers = {
            'content-type': 'application/json',
            'accept': 'application/json',
            'VERSION': '12',
            'AUTHTOKEN': undefined,
            'CLIENTAUTH': this.clientAuthToken,
            'PIN': this.pin,
        };
        if (addTokens) {
            headers.AUTHTOKEN = this.authToken;
        }
        const body = _body ? JSON.stringify(_body) : null;
        this.log.debug('Requesting ' + url + ': ' + JSON.stringify(body) + ', headers=' + JSON.stringify(headers));
        const response = await this.limiter.schedule({ priority: priority }, () => fetch(url, {
            method: 'POST',
            headers: headers,
            body: body,
        }));
        if (response.status >= 400) {
            if (logError) {
                this.log.error('Cannot request: url=' + url + ', request=' + JSON.stringify(body) + ', headers=' + JSON.stringify(headers)
                    + ', code=' + response.status + ', message=' + response.statusText + ', response.headers=' + JSON.stringify(response.headers));
            }
            return false;
        }
        if (response.headers.get('Content-Type') === 'application/json') {
            const json = await response.json();
            this.log.debug('API response ' + response.status + ' ' + response.statusText + ': ' + json);
            return json;
        }
        else {
            this.log.debug('API response ' + response.status + ' ' + response.statusText + ': bytes=' + response.size);
            return true;
        }
    }
    async connectWs(listener) {
        this.wsClosed = false;
        this.clearWsPingInterval();
        this.ws = new WebSocket(this.urlWebSocket, {
            headers: {
                'AUTHTOKEN': this.authToken,
                'CLIENTAUTH': this.clientAuthToken,
            },
        });
        this.ws.on('message', listener);
        /*
        this.ws.on('ping', () => {
        });
    
        this.ws.on('pong', () => {
        });
         */
        this.ws.on('open', () => {
            this.log.info('HmIP websocket connected.');
            // reset ping timer upon reconnect
            this.setWsPingInterval();
        });
        this.ws.on('close', () => {
            this.log.info('HmIP websocket disconnected.');
            this.clearWsPingInterval();
            if (!this.wsClosed) {
                this.setWsReconnectInterval(listener);
            }
        });
        this.ws.on('error', (error) => {
            this.log.error('HmIP websocket error: ' + error.message);
            this.clearWsPingInterval();
            if (!this.wsClosed) {
                this.setWsReconnectInterval(listener);
            }
        });
        this.ws.on('unexpected-response', (request, response) => {
            this.log.error('HmIP websocket unexpected response: ' + response.statusMessage + ' (' + response.statusCode + ')');
            this.clearWsPingInterval();
            if (!this.wsClosed) {
                this.setWsReconnectInterval(listener);
            }
        });
    }
    disconnectWs() {
        if (!this.wsClosed) {
            this.log.info('HmIP websocket shutdown...');
            this.wsClosed = true;
            this.ws?.close();
        }
    }
    clearWsPingInterval() {
        if (this.wsPingIntervalId) {
            clearInterval(this.wsPingIntervalId);
        }
    }
    clearWsReconnectInterval() {
        if (this.wsReconnectIntervalId) {
            clearInterval(this.wsReconnectIntervalId);
        }
    }
    setWsPingInterval() {
        this.clearWsReconnectInterval();
        if (this.ws) {
            this.wsPingIntervalId = setInterval(() => this.ws.ping(), this.wsPingIntervalMillis);
        }
    }
    setWsReconnectInterval(listener) {
        this.clearWsReconnectInterval();
        this.wsReconnectIntervalId = setInterval(() => this.connectWs(listener), this.wsReconnectIntervalMillis);
    }
    authConnectionRequest(deviceId) {
        const request = {
            'deviceId': deviceId,
            'deviceName': PLUGIN_NAME,
            'sgtin': this.accessPoint,
        };
        return this._apiCall(false, true, 'auth/connectionRequest', request, 0);
    }
    authRequestAcknowledged(deviceId) {
        const request = {
            'deviceId': deviceId,
        };
        return this._apiCall(false, false, 'auth/isRequestAcknowledged', request, 0);
    }
    authRequestToken(deviceId) {
        const request = {
            'deviceId': deviceId,
        };
        return this._apiCall(false, true, 'auth/requestAuthToken', request, 0);
    }
    authConfirmToken(deviceId, authToken) {
        const request = {
            'deviceId': deviceId,
            'authToken': authToken,
        };
        return this._apiCall(false, true, 'auth/confirmAuthToken', request, 0);
    }
}
//# sourceMappingURL=HmIPConnector.js.map