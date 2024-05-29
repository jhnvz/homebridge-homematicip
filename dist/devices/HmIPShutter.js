import { HmIPGenericDevice } from './HmIPGenericDevice.js';
/**
 * HomematicIP shutter
 *
 * HMIP-FROLL (Shutter Actuator - flush-mount)
 * HMIP-BROLL (Shutter Actuator - Brand-mount)
 *
 */
export class HmIPShutter extends HmIPGenericDevice {
    service;
    // Values are HomeKit style (100..0)
    shutterLevel = 0;
    processing = false;
    constructor(platform, accessory) {
        super(platform, accessory);
        this.service = this.accessory.getService(this.platform.Service.WindowCovering)
            || this.accessory.addService(this.platform.Service.WindowCovering);
        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.label);
        this.updateDevice(accessory.context.device, platform.groups);
        this.service.getCharacteristic(this.platform.Characteristic.CurrentPosition)
            .on('get', this.handleCurrentPositionGet.bind(this));
        this.service.getCharacteristic(this.platform.Characteristic.TargetPosition)
            .on('get', this.handleTargetPositionGet.bind(this))
            .on('set', this.handleTargetPositionSet.bind(this));
        this.service.getCharacteristic(this.platform.Characteristic.PositionState)
            .on('get', this.handlePositionStateGet.bind(this));
        this.service.getCharacteristic(this.platform.Characteristic.HoldPosition)
            .on('set', this.handleHoldPositionSet.bind(this));
    }
    handleCurrentPositionGet(callback) {
        callback(null, this.shutterLevel);
    }
    handleTargetPositionGet(callback) {
        callback(null, this.shutterLevel);
    }
    async handleTargetPositionSet(value, callback) {
        this.platform.log.info('Setting target shutter position for %s to %s %%', this.accessory.displayName, value);
        const body = {
            channelIndex: 1,
            deviceId: this.accessory.context.device.id,
            shutterLevel: HmIPShutter.shutterHomeKitToHmIP(value),
        };
        await this.platform.connector.apiCall('device/control/setShutterLevel', body);
        callback(null);
    }
    handlePositionStateGet(callback) {
        if (this.processing) {
            callback(null, this.platform.Characteristic.PositionState.DECREASING);
        }
        else {
            callback(null, this.platform.Characteristic.PositionState.STOPPED);
        }
    }
    async handleHoldPositionSet(value, callback) {
        this.platform.log.info('Setting shutter hold position for %s to %s', this.accessory.displayName, value);
        if (value === true) {
            const body = {
                channelIndex: 1,
                deviceId: this.accessory.context.device.id,
            };
            await this.platform.connector.apiCall('device/control/stop', body);
        }
        callback(null);
    }
    updateDevice(hmIPDevice, groups) {
        super.updateDevice(hmIPDevice, groups);
        for (const id in hmIPDevice.functionalChannels) {
            const channel = hmIPDevice.functionalChannels[id];
            if (channel.functionalChannelType === 'SHUTTER_CHANNEL' || channel.functionalChannelType === 'BLIND_CHANNEL') {
                const shutterChannel = channel;
                const shutterLevelHomeKit = HmIPShutter.shutterHmIPToHomeKit(shutterChannel.shutterLevel);
                if (shutterLevelHomeKit !== this.shutterLevel) {
                    this.shutterLevel = shutterLevelHomeKit;
                    this.platform.log.debug('Current shutter level of %s changed to %s %%', this.accessory.displayName, this.shutterLevel.toFixed(0));
                    this.service.updateCharacteristic(this.platform.Characteristic.CurrentPosition, this.shutterLevel);
                    this.service.updateCharacteristic(this.platform.Characteristic.TargetPosition, this.shutterLevel);
                }
                if (shutterChannel.processing !== this.processing) {
                    this.processing = shutterChannel.processing;
                    this.platform.log.debug('Processing state of shutter/blind %s changed to %s', this.accessory.displayName, this.processing);
                    this.service.updateCharacteristic(this.platform.Characteristic.PositionState, this.processing ?
                        this.platform.Characteristic.PositionState.DECREASING : this.platform.Characteristic.PositionState.STOPPED);
                }
            }
        }
    }
    static shutterHmIPToHomeKit(hmIPValue) {
        return (1 - hmIPValue) * 100.0;
    }
    static shutterHomeKitToHmIP(homeKitValue) {
        return (100 - homeKitValue) / 100.0;
    }
}
//# sourceMappingURL=HmIPShutter.js.map