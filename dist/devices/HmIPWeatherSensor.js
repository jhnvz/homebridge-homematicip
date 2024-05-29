import { HmIPGenericDevice } from './HmIPGenericDevice.js';
import moment from 'moment';
var WindValueType;
(function (WindValueType) {
    WindValueType["CURRENT_VALUE"] = "CURRENT_VALUE";
    WindValueType["MIN_VALUE"] = "MIN_VALUE";
    WindValueType["MAX_VALUE"] = "MAX_VALUE";
    WindValueType["AVERAGE_VALUE"] = "AVERAGE_VALUE";
})(WindValueType || (WindValueType = {}));
/**
 * HomematicIP weather sensor
 * HMIP-SWO-B
 *
 * This device creates both regular HomeKit services that can be used in the
 * Home App, but also emulates an Eve Weather Station.
 *
 * Supported Services:
 *
 * HumiditySensor (HomeKit default)
 * - CurrentRelativeHumidity
 *
 * TemperatureSensor (HomeKit default)
 * - CurrentTemperature: $actualTemperature
 * - TemperatureDisplayUnits: CELSIUS
 *
 *  WeatherService: UUID: E863F001-079E-48FF-8F27-9C2605A29F52
 *  - WeatherConditionCategory (UUID=cd65a9ab-85ad-494a-b2bd-2f380084134c, 0=sunshine==true,
 *        1=sunshine==false&&rain==false, 2=rain==true||storm==true, 3=snow (unsupported), 4=other)
 *  - Rain24h (UUID=ccc04890-565b-4376-b39a-3113341d9e0f, todayRainCounter)
 *  - RainBool (UUID=f14eb1ad-e000-4ef4-a54f-0cf07b2e7be7)
 *  - WindSpeed (UUID=49C8AE5A-A3A5-41AB-BF1F-12D5654F9F41)
 *  - WindDirection (UUID=46F1284C-1912-421B-82F5-EB75008B167E)*

 *    "actualTemperature": 8.1
 *    "humidity": 81,
 *    "vaporAmount": 6.731837071554497,
 *    "illumination": 3435,
 *    "windSpeed": 0,
 *    "sunshine": false,
 *    "storm": false,
 *    "totalSunshineDuration": 92,
 *    "todaySunshineDuration": 2,
 *    "yesterdaySunshineDuration": 84,
 *    "illuminationThresholdSunshine": 3000,
 *    "windValueType": "CURRENT_VALUE",
 *    "raining": false,
 *    "totalRainCounter": 0.9,
 *    "todayRainCounter": 0,
 *    "yesterdayRainCounter": 0,
 *    "windDirection": 80,
 *    "windDirectionVariation": 45,
 *    "weathervaneAlignmentNeeded": false
 *
 */
export class HmIPWeatherSensor extends HmIPGenericDevice {
    // every 5 minutes
    historyEventUpdateFrequencyMs = 5 * 60 * 1000;
    actualTemperature = 0.0;
    humidity = 0.0;
    illumination = 0.0;
    illuminationThresholdSunshine = 0.0;
    storm = false;
    sunshine = false;
    todaySunshineDuration = 0.0;
    totalSunshineDuration = 0.0;
    windSpeed = 0.0;
    windValueType = WindValueType.CURRENT_VALUE;
    yesterdaySunshineDuration = 0.0;
    vaporAmount = 0.0;
    lightSensorService;
    temperatureService;
    humidityService;
    stormOccupancyService;
    sunshineOccupancyService;
    windSpeedOccupancyService;
    withStormSensor = false;
    withSunshineSensor = false;
    withWindSpeedSensor = false;
    weatherService;
    historyService;
    eventEmitterTimeout;
    constructor(platform, accessory) {
        super(platform, accessory);
        this.withStormSensor = accessory.context.config && accessory.context.config.withStormSensor;
        this.withSunshineSensor = accessory.context.config && accessory.context.config.withSunshineSensor;
        this.withWindSpeedSensor = accessory.context.config && accessory.context.config.withWindSpeedSensor;
        this.temperatureService = this.accessory.getService(this.platform.Service.TemperatureSensor)
            || this.accessory.addService(this.platform.Service.TemperatureSensor);
        this.temperatureService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.label);
        this.humidityService = this.accessory.getService(this.platform.Service.HumiditySensor)
            || this.accessory.addService(this.platform.Service.HumiditySensor);
        this.humidityService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.label);
        this.lightSensorService = this.accessory.getService(this.platform.Service.LightSensor)
            || this.accessory.addService(this.platform.Service.LightSensor);
        this.lightSensorService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.label);
        this.weatherService = this.accessory.getService('WeatherService')
            || this.accessory.addService(new platform.api.hap.Service('WeatherService', 'E863F001-079E-48FF-8F27-9C2605A29F52'));
        if (this.withStormSensor) {
            this.stormOccupancyService = this.accessory.getServiceById(this.platform.Service.OccupancySensor, 'Storm')
                || this.accessory.addService(new this.platform.Service.OccupancySensor(accessory.context.device.label + ' Storm', 'Storm'));
            this.stormOccupancyService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.label + ' Storm');
        }
        if (this.withSunshineSensor) {
            this.sunshineOccupancyService = this.accessory.getServiceById(this.platform.Service.OccupancySensor, 'Sunshine')
                || this.accessory.addService(new this.platform.Service.OccupancySensor(accessory.context.device.label + ' Sunshine', 'Sunshine'));
            this.sunshineOccupancyService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.label + ' Sunshine');
        }
        if (this.withWindSpeedSensor) {
            this.windSpeedOccupancyService = this.accessory.getServiceById(this.platform.Service.OccupancySensor, 'WindSpeed')
                || this.accessory.addService(new this.platform.Service.OccupancySensor(accessory.context.device.label + '  WindSpeed', 'WindSpeed'));
            this.windSpeedOccupancyService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.label + ' WindSpeed');
        }
        this.historyService = new this.platform.FakeGatoHistoryService('weather', this.accessory, {
            log: this.platform.log,
            storage: 'fs',
            path: this.platform.api.user.storagePath() + '/accessories',
            filename: 'history_' + this.accessory.context.device.id + '.json',
            length: 1000,
        });
        // update initially
        this.platform.log.debug(`Created WeatherSensor ${accessory.context.device.label}`);
        this.updateDevice(accessory.context.device, platform.groups);
        // register characteristics
        this.lightSensorService.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
            .on('get', this.handleGetIllumination.bind(this));
        this.temperatureService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
            .setProps({ minValue: -100 })
            .on('get', this.handleGetActualTemperature.bind(this));
        this.temperatureService.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
            .on('get', this.handleGetTemperatureDisplayUnits.bind(this));
        this.humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
            .on('get', this.handleGetHumidity.bind(this));
        this.weatherService?.getCharacteristic(this.platform.customCharacteristic.characteristic.WindSpeed)
            .on('get', this.handleGetWindSpeed.bind(this));
        this.weatherService?.getCharacteristic(this.platform.customCharacteristic.characteristic.WeatherConditionCategory)
            .on('get', this.handleGetWeatherConditionCategory.bind(this));
        this.stormOccupancyService?.getCharacteristic(this.platform.Characteristic.OccupancyDetected)
            .on('get', this.handleGetStorm.bind(this));
        this.sunshineOccupancyService?.getCharacteristic(this.platform.Characteristic.OccupancyDetected)
            .on('get', this.handleGetSunshine.bind(this));
        this.windSpeedOccupancyService?.getCharacteristic(this.platform.Characteristic.OccupancyDetected)
            .on('get', this.handleGetWindSpeedOccupancy.bind(this));
    }
    handleGetActualTemperature(callback) {
        callback(null, this.actualTemperature);
    }
    handleGetHumidity(callback) {
        callback(null, this.humidity);
    }
    handleGetIllumination(callback) {
        callback(null, this.illumination);
    }
    handleGetWindSpeed(callback) {
        callback(null, this.windSpeed);
    }
    handleGetStorm(callback) {
        callback(null, this.storm
            ? this.platform.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
            : this.platform.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
    }
    handleGetSunshine(callback) {
        callback(null, this.sunshine
            ? this.platform.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
            : this.platform.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
    }
    handleGetWindSpeedOccupancy(callback) {
        callback(null, this.windSpeed >= 1.852 // considering >= 1 knots as "wind"
            ? this.platform.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
            : this.platform.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
    }
    handleGetTemperatureDisplayUnits(callback) {
        callback(null, this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS);
    }
    handleGetWeatherConditionCategory(callback) {
        if (this.storm) {
            callback(null, 9);
        }
        else if (this.humidity >= 99) {
            callback(null, 4);
        }
        else if (this.sunshine) {
            callback(null, 0);
        }
        else {
            callback(null, 3);
        }
    }
    startHistoryEventEmitter() {
        this.emitHistoryEvent();
        // cancel scheduled event before recreating
        if (this.eventEmitterTimeout !== null) {
            clearTimeout(this.eventEmitterTimeout);
        }
        this.eventEmitterTimeout = setTimeout(() => this.startHistoryEventEmitter(), this.historyEventUpdateFrequencyMs);
    }
    emitHistoryEvent() {
        const data = {
            time: moment().unix(),
            temp: this.actualTemperature,
            pressure: 0,
            humidity: this.humidity
        };
        this.historyService.addEntry(data);
    }
    updateDevice(hmIPDevice, groups) {
        super.updateDevice(hmIPDevice, groups);
        for (const id in hmIPDevice.functionalChannels) {
            const channel = hmIPDevice.functionalChannels[id];
            if (channel.functionalChannelType === 'WEATHER_SENSOR_CHANNEL'
                || channel.functionalChannelType === 'WEATHER_SENSOR_PLUS_CHANNEL'
                || channel.functionalChannelType === 'WEATHER_SENSOR_PRO_CHANNEL') {
                const weatherSensorChannel = channel;
                this.platform.log.debug(`WeatherSensor update: ${JSON.stringify(channel)}`);
                if (weatherSensorChannel.actualTemperature !== null && weatherSensorChannel.actualTemperature !== this.actualTemperature) {
                    this.actualTemperature = weatherSensorChannel.actualTemperature;
                    this.platform.log.info('WeatherSensor %s changed actualTemperature=%d', this.accessory.displayName, this.actualTemperature);
                    this.temperatureService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.actualTemperature);
                }
                if (weatherSensorChannel.humidity !== null && weatherSensorChannel.humidity !== this.humidity) {
                    this.humidity = weatherSensorChannel.humidity;
                    this.platform.log.info('WeatherSensor %s changed humidity=%d', this.accessory.displayName, this.humidity);
                    this.humidityService.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, this.humidity);
                }
                if (weatherSensorChannel.illumination !== null && weatherSensorChannel.illumination !== this.illumination) {
                    this.illumination = weatherSensorChannel.illumination;
                    this.platform.log.info('WeatherSensor %s changed illumination=%d', this.accessory.displayName, this.illumination);
                    this.lightSensorService.updateCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel, this.illumination);
                }
                if (weatherSensorChannel.illuminationThresholdSunshine !== null && weatherSensorChannel.illuminationThresholdSunshine !== this.illuminationThresholdSunshine) {
                    this.illuminationThresholdSunshine = weatherSensorChannel.illuminationThresholdSunshine;
                    this.platform.log.info('WeatherSensor %s changed illuminationThresholdSunshine=%d', this.accessory.displayName, this.illuminationThresholdSunshine);
                }
                if (weatherSensorChannel.storm !== null && weatherSensorChannel.storm !== this.storm) {
                    this.storm = weatherSensorChannel.storm;
                    this.platform.log.info('WeatherSensor %s changed storm=%s', this.accessory.displayName, this.storm);
                    this.stormOccupancyService?.updateCharacteristic(this.platform.Characteristic.OccupancyDetected, this.storm
                        ? this.platform.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
                        : this.platform.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
                }
                if (weatherSensorChannel.sunshine !== null && weatherSensorChannel.sunshine !== this.sunshine) {
                    this.sunshine = weatherSensorChannel.sunshine;
                    this.platform.log.info('WeatherSensor %s changed sunshine=%s', this.accessory.displayName, this.sunshine);
                    this.sunshineOccupancyService?.updateCharacteristic(this.platform.Characteristic.OccupancyDetected, this.sunshine
                        ? this.platform.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
                        : this.platform.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
                }
                if (weatherSensorChannel.todaySunshineDuration !== null && weatherSensorChannel.todaySunshineDuration !== this.todaySunshineDuration) {
                    this.todaySunshineDuration = weatherSensorChannel.todaySunshineDuration;
                    this.platform.log.info('WeatherSensor %s changed todaySunshineDuration=%s', this.accessory.displayName, this.todaySunshineDuration);
                }
                if (weatherSensorChannel.totalSunshineDuration !== null && weatherSensorChannel.totalSunshineDuration !== this.totalSunshineDuration) {
                    this.totalSunshineDuration = weatherSensorChannel.totalSunshineDuration;
                    this.platform.log.info('WeatherSensor %s changed totalSunshineDuration=%s', this.accessory.displayName, this.totalSunshineDuration);
                }
                if (weatherSensorChannel.windSpeed !== null && weatherSensorChannel.windSpeed !== this.windSpeed) {
                    this.windSpeed = weatherSensorChannel.windSpeed;
                    this.platform.log.info('WeatherSensor %s changed windSpeed=%s', this.accessory.displayName, this.windSpeed);
                    this.windSpeedOccupancyService?.updateCharacteristic(this.platform.Characteristic.OccupancyDetected, this.windSpeed > 5
                        ? this.platform.Characteristic.OccupancyDetected.OCCUPANCY_DETECTED
                        : this.platform.Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
                }
                if (weatherSensorChannel.windValueType !== null && weatherSensorChannel.windValueType !== this.windValueType) {
                    this.windValueType = weatherSensorChannel.windValueType;
                    this.platform.log.info('WeatherSensor %s changed windValueType=%s', this.accessory.displayName, this.windValueType);
                }
                if (weatherSensorChannel.yesterdaySunshineDuration !== null && weatherSensorChannel.yesterdaySunshineDuration !== this.yesterdaySunshineDuration) {
                    this.yesterdaySunshineDuration = weatherSensorChannel.yesterdaySunshineDuration;
                    this.platform.log.info('WeatherSensor %s changed yesterdaySunshineDuration=%s', this.accessory.displayName, this.yesterdaySunshineDuration);
                }
                if (weatherSensorChannel.vaporAmount !== null && weatherSensorChannel.vaporAmount !== this.vaporAmount) {
                    this.vaporAmount = weatherSensorChannel.vaporAmount;
                    this.platform.log.info('WeatherSensor %s changed vaporAmount=%s', this.accessory.displayName, this.vaporAmount);
                }
            }
        }
        // start once (!) after first device update
        if (this.eventEmitterTimeout === null) {
            this.startHistoryEventEmitter();
        }
    }
}
//# sourceMappingURL=HmIPWeatherSensor.js.map