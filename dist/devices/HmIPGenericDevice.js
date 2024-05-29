/**
 * Generic device
 */
export class HmIPGenericDevice {
    platform;
    accessory;
    hidden = false;
    unreach = false;
    lowBat = false;
    rssiDeviceValue = 0;
    rssiPeerValue = 0;
    dutyCycle = false;
    configPending = false;
    featureSabotage = false;
    accessoryConfig;
    batteryService;
    constructor(platform, accessory) {
        this.platform = platform;
        this.accessory = accessory;
        this.accessoryConfig = platform.config['devices']?.[accessory.context.device.id];
        this.hidden = this.accessoryConfig?.['hide'] === true;
        this.accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, accessory.context.device.oem)
            .setCharacteristic(this.platform.Characteristic.Model, accessory.context.device.modelType)
            .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.context.device.id)
            .setCharacteristic(this.platform.Characteristic.FirmwareRevision, accessory.context.device.firmwareVersion);
        const hmIPDevice = accessory.context.device;
        let featureLowBat = false;
        for (const id in hmIPDevice.functionalChannels) {
            const channel = hmIPDevice.functionalChannels[id];
            if (channel.functionalChannelType === 'DEVICE_OPERATIONLOCK'
                || channel.functionalChannelType === 'DEVICE_BASE'
                || channel.functionalChannelType === 'DEVICE_SABOTAGE') {
                const baseChannel = channel;
                featureLowBat = baseChannel.supportedOptionalFeatures.IOptionalFeatureLowBat;
                if (channel.functionalChannelType === 'DEVICE_SABOTAGE') {
                    this.featureSabotage = true;
                }
            }
        }
        if (featureLowBat) {
            this.batteryService = this.accessory.getService(this.platform.Service.Battery)
                || this.accessory.addService(this.platform.Service.Battery);
            this.batteryService.getCharacteristic(this.platform.Characteristic.StatusLowBattery)
                .on('get', this.handleStatusLowBatteryGet.bind(this));
        }
    }
    handleStatusLowBatteryGet(callback) {
        callback(null, (this.lowBat ? this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
            : this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL));
    }
    updateDevice(hmIPDevice, groups) {
        for (const id in hmIPDevice.functionalChannels) {
            const channel = hmIPDevice.functionalChannels[id];
            if (channel.functionalChannelType === 'DEVICE_OPERATIONLOCK'
                || channel.functionalChannelType === 'DEVICE_BASE'
                || channel.functionalChannelType === 'DEVICE_SABOTAGE') {
                const baseChannel = channel;
                if (baseChannel.unreach !== null && baseChannel.unreach !== this.unreach) {
                    this.unreach = baseChannel.unreach;
                    this.platform.log.info('Unreach of %s changed to %s', this.accessory.displayName, this.unreach);
                }
                if (this.batteryService && baseChannel.lowBat !== null && baseChannel.lowBat !== this.lowBat) {
                    this.lowBat = baseChannel.lowBat;
                    this.platform.log.info('LowBat of %s changed to %s', this.accessory.displayName, this.lowBat);
                    this.batteryService.setCharacteristic(this.platform.Characteristic.StatusLowBattery, this.lowBat ? this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
                        : this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                }
            }
        }
    }
}
//# sourceMappingURL=HmIPGenericDevice.js.map