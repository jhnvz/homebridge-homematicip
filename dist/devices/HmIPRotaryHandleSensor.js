import { HmIPGenericDevice } from './HmIPGenericDevice.js';
var WindowState;
(function (WindowState) {
    WindowState["OPEN"] = "OPEN";
    WindowState["CLOSED"] = "CLOSED";
    WindowState["TILTED"] = "TILTED";
})(WindowState || (WindowState = {}));
/**
 * HomematicIP rotary handle sensor
 *
 * HMIP-SRH
 */
export class HmIPRotaryHandleSensor extends HmIPGenericDevice {
    service;
    windowState = WindowState.CLOSED;
    constructor(platform, accessory) {
        super(platform, accessory);
        this.platform.log.debug(`Created HmIPRotaryHandleSensor ${accessory.context.device.label}`);
        this.service = this.accessory.getService(this.platform.Service.Window) || this.accessory.addService(this.platform.Service.Window);
        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.label);
        this.service.getCharacteristic(this.platform.Characteristic.CurrentPosition)
            .on('get', this.handleWindowCurrentPositionGet.bind(this));
        this.service.getCharacteristic(this.platform.Characteristic.PositionState)
            .on('get', this.handleWindowPositionStateGet.bind(this));
        this.service.getCharacteristic(this.platform.Characteristic.TargetPosition)
            .on('get', this.handleWindowTargetPositionGet.bind(this))
            .on('set', this.handleWindowTargetPositionSet.bind(this));
        this.updateDevice(accessory.context.device, platform.groups);
    }
    handleWindowCurrentPositionGet(callback) {
        callback(null, this.getWindowPosition());
    }
    handleWindowPositionStateGet(callback) {
        callback(null, this.platform.Characteristic.PositionState.STOPPED);
    }
    handleWindowTargetPositionGet(callback) {
        callback(null, this.getWindowPosition());
    }
    handleWindowTargetPositionSet(value, callback) {
        this.platform.log.info('Ignoring setting target position for %s to %s', this.accessory.displayName, value);
        callback(null);
    }
    getWindowPosition() {
        switch (this.windowState) {
            case WindowState.CLOSED:
                return 0;
            case WindowState.TILTED:
                return 50;
            case WindowState.OPEN:
                return 100;
        }
    }
    updateDevice(hmIPDevice, groups) {
        super.updateDevice(hmIPDevice, groups);
        for (const id in hmIPDevice.functionalChannels) {
            const channel = hmIPDevice.functionalChannels[id];
            if (channel.functionalChannelType === 'ROTARY_HANDLE_CHANNEL') {
                const rotaryHandleChannel = channel;
                this.platform.log.debug('Rotary handle update: %s', JSON.stringify(channel));
                if (rotaryHandleChannel.windowState !== this.windowState) {
                    this.windowState = rotaryHandleChannel.windowState;
                    this.platform.log.info('Rotary handle state of %s changed to %s', this.accessory.displayName, this.windowState);
                    this.service.updateCharacteristic(this.platform.Characteristic.CurrentPosition, this.getWindowPosition());
                    this.service.updateCharacteristic(this.platform.Characteristic.TargetPosition, this.getWindowPosition());
                }
            }
        }
    }
}
//# sourceMappingURL=HmIPRotaryHandleSensor.js.map