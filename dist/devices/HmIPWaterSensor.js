import { HmIPGenericDevice } from './HmIPGenericDevice.js';
/**
 * HomematicIP water sensor
 *
 * HmIP-SWD
 */
export class HmIPWaterSensor extends HmIPGenericDevice {
    waterLevelService;
    moistureDetected = false;
    waterlevelDetected = false;
    constructor(platform, accessory) {
        super(platform, accessory);
        this.platform.log.debug(`Created water sensor ${accessory.context.device.label}`);
        this.waterLevelService = this.accessory.getService(this.platform.Service.LeakSensor)
            || this.accessory.addService(this.platform.Service.LeakSensor);
        this.waterLevelService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.label);
        this.waterLevelService.getCharacteristic(this.platform.Characteristic.LeakDetected)
            .on('get', this.handleWaterLevelDetectedGet.bind(this));
        this.updateDevice(accessory.context.device, platform.groups);
    }
    handleWaterLevelDetectedGet(callback) {
        callback(null, this.waterlevelDetected
            ? this.platform.Characteristic.LeakDetected.LEAK_DETECTED
            : this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED);
    }
    updateDevice(hmIPDevice, groups) {
        super.updateDevice(hmIPDevice, groups);
        for (const id in hmIPDevice.functionalChannels) {
            const channel = hmIPDevice.functionalChannels[id];
            if (channel.functionalChannelType === 'WATER_SENSOR_CHANNEL') {
                const waterSensorChannel = channel;
                this.platform.log.debug(`Water sensor update: ${JSON.stringify(channel)}`);
                if (waterSensorChannel.moistureDetected !== null && waterSensorChannel.moistureDetected !== this.moistureDetected) {
                    this.moistureDetected = waterSensorChannel.moistureDetected;
                    this.platform.log.info('Water sensor moisture detection of %s changed to %s', this.accessory.displayName, this.moistureDetected);
                }
                if (waterSensorChannel.waterlevelDetected !== null && waterSensorChannel.waterlevelDetected !== this.waterlevelDetected) {
                    this.waterlevelDetected = waterSensorChannel.waterlevelDetected;
                    this.platform.log.info('Water sensor water level detection of %s changed to %s', this.accessory.displayName, this.waterlevelDetected);
                    this.waterLevelService.updateCharacteristic(this.platform.Characteristic.LeakDetected, this.waterlevelDetected
                        ? this.platform.Characteristic.LeakDetected.LEAK_DETECTED
                        : this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED);
                }
            }
        }
    }
}
//# sourceMappingURL=HmIPWaterSensor.js.map