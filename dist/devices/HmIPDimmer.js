import { HmIPGenericDevice } from './HmIPGenericDevice.js';
/**
 * HomematicIP dimmer
 *
 * HmIP-PDT Pluggable Dimmer
 * HmIP-BDT Brand Dimmer
 * HmIP-FDT Dimming Actuator flush-mount
 * HmIPW-DRD3 (Homematic IP Wired Dimming Actuator – 3x channels)
 *
 */
export class HmIPDimmer extends HmIPGenericDevice {
    service;
    brightness = 0;
    constructor(platform, accessory) {
        super(platform, accessory);
        this.platform.log.debug(`Created dimmer ${accessory.context.device.label}`);
        this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);
        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.label);
        this.service.getCharacteristic(this.platform.Characteristic.On)
            .on('get', this.handleOnGet.bind(this))
            .on('set', this.handleOnSet.bind(this));
        this.service.getCharacteristic(this.platform.Characteristic.Brightness)
            .on('get', this.handleBrightnessGet.bind(this))
            .on('set', this.handleBrightnessSet.bind(this));
        this.updateDevice(accessory.context.device, platform.groups);
    }
    handleOnGet(callback) {
        callback(null, this.brightness > 0);
    }
    async handleOnSet(value, callback) {
        if (value && this.brightness === 0) {
            await this.handleBrightnessSet(100, callback);
        }
        else if (!value) {
            await this.handleBrightnessSet(0, callback);
        }
        else {
            callback(null);
        }
    }
    handleBrightnessGet(callback) {
        callback(null, this.brightness);
    }
    async handleBrightnessSet(value, callback) {
        this.platform.log.info('Setting brightness of %s to %s %%', this.accessory.displayName, value);
        const body = {
            channelIndex: 1,
            deviceId: this.accessory.context.device.id,
            dimLevel: value / 100.0,
        };
        await this.platform.connector.apiCall('device/control/setDimLevel', body);
        callback(null);
    }
    updateDevice(hmIPDevice, groups) {
        super.updateDevice(hmIPDevice, groups);
        for (const id in hmIPDevice.functionalChannels) {
            const channel = hmIPDevice.functionalChannels[id];
            if (channel.functionalChannelType === 'DIMMER_CHANNEL') {
                const dimmerChannel = channel;
                this.platform.log.debug(`Dimmer update: ${JSON.stringify(channel)}`);
                const brightness = dimmerChannel.dimLevel * 100.0;
                if (brightness !== null && brightness !== this.brightness) {
                    if (this.brightness === 0) {
                        this.platform.log.info('Dimmer state %s changed to ON', this.accessory.displayName);
                        this.service.updateCharacteristic(this.platform.Characteristic.On, true);
                    }
                    if (brightness === 0) {
                        this.platform.log.info('Dimmer state %s changed to OFF', this.accessory.displayName);
                        this.service.updateCharacteristic(this.platform.Characteristic.On, false);
                    }
                    this.brightness = brightness;
                    this.platform.log.debug('Brightness of %s changed to %s %%', this.accessory.displayName, this.brightness.toFixed(0));
                    this.service.updateCharacteristic(this.platform.Characteristic.Brightness, this.brightness);
                }
            }
        }
    }
}
//# sourceMappingURL=HmIPDimmer.js.map