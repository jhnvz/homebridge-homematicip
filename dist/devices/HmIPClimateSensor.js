import { HmIPGenericDevice } from './HmIPGenericDevice.js';
/**
 * HomematicIP Climate Sensor
 *
 * HmIP-STHO
 * HmIP-STHO-A
 *
 */
export class HmIPClimateSensor extends HmIPGenericDevice {
    temperatureService;
    humidityService;
    actualTemperature = 0;
    humidity = 0;
    constructor(platform, accessory) {
        super(platform, accessory);
        this.temperatureService = this.accessory.getService(this.platform.Service.TemperatureSensor)
            || this.accessory.addService(this.platform.Service.TemperatureSensor);
        this.temperatureService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.label);
        this.humidityService = this.accessory.getService(this.platform.Service.HumiditySensor)
            || this.accessory.addService(this.platform.Service.HumiditySensor);
        this.humidityService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.label);
        this.updateDevice(accessory.context.device, platform.groups);
        this.temperatureService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
            .setProps({ minValue: -100 })
            .on('get', this.handleCurrentTemperatureGet.bind(this));
        this.humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
            .on('get', this.handleCurrentRelativeHumidityGet.bind(this));
    }
    handleCurrentTemperatureGet(callback) {
        callback(null, this.actualTemperature);
    }
    handleCurrentRelativeHumidityGet(callback) {
        callback(null, this.humidity);
    }
    updateDevice(hmIPDevice, groups) {
        super.updateDevice(hmIPDevice, groups);
        for (const id in hmIPDevice.functionalChannels) {
            const channel = hmIPDevice.functionalChannels[id];
            if (channel.functionalChannelType === 'CLIMATE_SENSOR_CHANNEL'
                || channel.functionalChannelType === 'WALL_MOUNTED_THERMOSTAT_WITHOUT_DISPLAY_CHANNEL'
                || channel.functionalChannelType === 'WALL_MOUNTED_THERMOSTAT_PRO_CHANNEL') {
                const climateSensorChannel = channel;
                if (climateSensorChannel.actualTemperature !== this.actualTemperature) {
                    this.actualTemperature = climateSensorChannel.actualTemperature;
                    this.platform.log.debug('Current temperature of %s changed to %s °C', this.accessory.displayName, this.actualTemperature);
                    this.temperatureService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.actualTemperature);
                }
                if (climateSensorChannel.humidity !== this.humidity) {
                    this.humidity = climateSensorChannel.humidity;
                    this.platform.log.debug('Current relative humidity of %s changed to %s %%', this.accessory.displayName, this.humidity);
                    this.humidityService.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, this.humidity);
                }
            }
        }
    }
}
//# sourceMappingURL=HmIPClimateSensor.js.map