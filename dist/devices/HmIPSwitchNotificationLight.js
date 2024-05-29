import { HmIPGenericDevice } from './HmIPGenericDevice.js';
class NotificationLight {
    index;
    label;
    simpleColor;
    opticalSignal;
    service;
    hue = 0;
    saturation = 0;
    lightness = 0;
    brightness = 0;
    on = false;
    hasOpticalSignal = false;
    constructor(name, channelIdx, lightbulb) {
        this.label = name;
        this.index = channelIdx;
        this.service = lightbulb;
    }
}
/* HmIP color palette based on HSL values */
const HmIPColorPaletteHSL = new Map([
    ['BLACK', [0, 0, 0]],
    ['BLUE', [240, 100, 50]],
    ['GREEN', [120, 100, 50]],
    ['TURQUOISE', [180, 100, 50]],
    ['RED', [0, 100, 50]],
    ['PURPLE', [300, 100, 50]],
    ['YELLOW', [60, 100, 50]],
    ['WHITE', [0, 0, 100]],
]);
const HmIPTopLightChannelIndex = 2;
const HmIPBottomLightChannelIndex = 3;
/**
 * HomematicIP switch with notification light
 *
 * Switches
 *
 * HMIP-BSL (Brand Switch Notification Light)
 *
 */
export class HmIPSwitchNotificationLight extends HmIPGenericDevice {
    service;
    on = false;
    button1Led;
    button2Led;
    topLight;
    bottomLight;
    simpleSwitch = false;
    constructor(platform, accessory) {
        super(platform, accessory);
        this.platform.log.debug(`Created switch ${accessory.context.device.label}`);
        this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);
        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.label);
        this.service.getCharacteristic(this.platform.Characteristic.On)
            .on('get', this.handleOnGet.bind(this))
            .on('set', this.handleOnSet.bind(this));
        this.simpleSwitch = this.accessoryConfig?.['simpleSwitch'] === true;
        if (!this.simpleSwitch) {
            this.button1Led = this.accessory.getServiceById(this.platform.Service.Lightbulb, 'Button1');
            if (!this.button1Led) {
                this.button1Led = new this.platform.Service.Lightbulb(accessory.context.device.label, 'Button1');
                if (this.button1Led) {
                    this.button1Led = this.accessory.addService(this.button1Led);
                }
                else {
                    this.platform.log.error('Error adding service to %s for button 1 led', accessory.context.device.label);
                }
            }
            this.button2Led = this.accessory.getServiceById(this.platform.Service.Lightbulb, 'Button2');
            if (!this.button2Led) {
                this.button2Led = new this.platform.Service.Lightbulb(accessory.context.device.label, 'Button2');
                if (this.button2Led) {
                    this.button2Led = this.accessory.addService(this.button2Led);
                }
                else {
                    this.platform.log.error('Error adding service to %s for button 2 led', accessory.context.device.label);
                }
            }
            this.button1Led.getCharacteristic(this.platform.Characteristic.On)
                .on('get', this.handleButton1LedOnGet.bind(this))
                .on('set', this.handleButton1LedOnSet.bind(this));
            this.button1Led.getCharacteristic(this.platform.Characteristic.Brightness)
                .on('get', this.handleButton1LedBrightnessGet.bind(this))
                .on('set', this.handleButton1LedBrightnessSet.bind(this));
            this.button1Led.getCharacteristic(this.platform.Characteristic.Hue)
                .on('get', this.handleButton1LedHueGet.bind(this))
                .on('set', this.handleButton1LedHueSet.bind(this));
            this.button1Led.getCharacteristic(this.platform.Characteristic.Saturation)
                .on('get', this.handleButton1LedSaturationGet.bind(this))
                .on('set', this.handleButton1LedSaturationSet.bind(this));
            this.button1Led.getCharacteristic(this.platform.customCharacteristic.characteristic.OpticalSignal)
                .on('get', this.handleButton1LedOpticalSignalGet.bind(this))
                .on('set', this.handleButton1LedOpticalSignalSet.bind(this));
            this.button2Led.getCharacteristic(this.platform.Characteristic.On)
                .on('get', this.handleButton2LedOnGet.bind(this))
                .on('set', this.handleButton2LedOnSet.bind(this));
            this.button2Led.getCharacteristic(this.platform.Characteristic.Brightness)
                .on('get', this.handleButton2LedBrightnessGet.bind(this))
                .on('set', this.handleButton2LedBrightnessSet.bind(this));
            this.button2Led.getCharacteristic(this.platform.Characteristic.Hue)
                .on('get', this.handleButton2LedHueGet.bind(this))
                .on('set', this.handleButton2LedHueSet.bind(this));
            this.button2Led.getCharacteristic(this.platform.Characteristic.Saturation)
                .on('get', this.handleButton2LedSaturationGet.bind(this))
                .on('set', this.handleButton2LedSaturationSet.bind(this));
            this.button2Led.getCharacteristic(this.platform.customCharacteristic.characteristic.OpticalSignal)
                .on('get', this.handleButton2LedOpticalSignalGet.bind(this))
                .on('set', this.handleButton2LedOpticalSignalSet.bind(this));
            this.topLight = new NotificationLight('Button 1', HmIPTopLightChannelIndex, this.button1Led);
            this.bottomLight = new NotificationLight('Button 2', HmIPBottomLightChannelIndex, this.button2Led);
        }
        else {
            const topLightService = this.accessory.getServiceById(this.platform.Service.Lightbulb, 'Button1');
            if (topLightService !== undefined) {
                this.accessory.removeService(topLightService);
            }
            const bottomLightService = this.accessory.getServiceById(this.platform.Service.Lightbulb, 'Button2');
            if (bottomLightService !== undefined) {
                this.accessory.removeService(bottomLightService);
            }
            this.platform.log.info('Removing light services from %s (config=%s)', accessory.context.device.label, this.simpleSwitch);
        }
        this.updateDevice(accessory.context.device, platform.groups);
    }
    /*
     * Switch handlers
     */
    handleOnGet(callback) {
        this.platform.log.debug('Current switch state of %s is %s', this.accessory.displayName, this.on ? 'ON' : 'OFF');
        callback(null, this.on);
    }
    async handleOnSet(value, callback) {
        this.platform.log.info('Setting switch %s to %s', this.accessory.displayName, value ? 'ON' : 'OFF');
        const body = {
            channelIndex: 1,
            deviceId: this.accessory.context.device.id,
            on: value,
        };
        await this.platform.connector.apiCall('device/control/setSwitchState', body);
        callback(null);
    }
    /*
     * Light On characteristic handlers
     */
    buttonLedOnGet(light) {
        this.platform.log.debug('Get light state of %s:%s (%s)', this.accessory.displayName, light.label, light.on ? 'ON' : 'OFF');
        return (light.on ? 1 : 0);
    }
    handleButton1LedOnGet(callback) {
        callback(null, this.buttonLedOnGet(this.topLight));
    }
    handleButton2LedOnGet(callback) {
        callback(null, this.buttonLedOnGet(this.bottomLight));
    }
    async buttonLedOnSet(light, value, callback) {
        light.on = (value > 0);
        this.platform.log.debug('Set light state of %s:%s to %s', this.accessory.displayName, light.label, light.on ? 'ON' : 'OFF');
        if (value > 0 && light.brightness == 0) {
            await this.buttonLedBrightnessSet(light, 100, callback);
        }
        else if (value == 0) {
            await this.buttonLedBrightnessSet(light, 0, callback);
        }
        else {
            callback(null);
        }
    }
    async handleButton1LedOnSet(value, callback) {
        await this.buttonLedOnSet(this.topLight, value, callback);
    }
    async handleButton2LedOnSet(value, callback) {
        await this.buttonLedOnSet(this.bottomLight, value, callback);
    }
    /*
     * Light Brightness characteristic handlers
     */
    buttonLedBrightnessGet(light) {
        this.platform.log.debug('Get light brightness of %s:%s (%d)', this.accessory.displayName, light.label, light.brightness);
        return light.brightness;
    }
    handleButton1LedBrightnessGet(callback) {
        callback(null, this.buttonLedBrightnessGet(this.topLight));
    }
    handleButton2LedBrightnessGet(callback) {
        callback(null, this.buttonLedBrightnessGet(this.bottomLight));
    }
    async buttonLedBrightnessSet(light, value, callback) {
        if (light.brightness != value) {
            light.brightness = value;
            light.on = (value > 0);
            if (light.hasOpticalSignal &&
                ((light.opticalSignal == 'OFF' && value > 0) ||
                    (light.opticalSignal != 'OFF' && value == 0))) {
                await this.buttonLedOpticalSignalSet(light, "AUTO", callback);
            }
            else {
                this.platform.log.debug('Set light brightness of %s:%s to %d %%', this.accessory.displayName, light.label, value);
                const body = {
                    channelIndex: light.index,
                    deviceId: this.accessory.context.device.id,
                    dimLevel: value / 100.0,
                };
                await this.platform.connector.apiCall('device/control/setDimLevel', body);
                callback(null);
            }
        }
        else {
            callback(null);
        }
    }
    async handleButton1LedBrightnessSet(value, callback) {
        await this.buttonLedBrightnessSet(this.topLight, value, callback);
    }
    async handleButton2LedBrightnessSet(value, callback) {
        await this.buttonLedBrightnessSet(this.bottomLight, value, callback);
    }
    /*
     * Light Hue characteristic handlers
     */
    buttonLedHueGet(light) {
        this.platform.log.debug('Get light hue of %s:%s (%d)', this.accessory.displayName, light.label, light.hue);
        return light.hue;
    }
    handleButton1LedHueGet(callback) {
        callback(null, this.buttonLedHueGet(this.topLight));
    }
    handleButton2LedHueGet(callback) {
        callback(null, this.buttonLedHueGet(this.bottomLight));
    }
    async buttonLedColorSet(light, callback) {
        const color = this.getNearestHmIPColorFromHSL(light.hue, light.saturation, light.lightness);
        if (light.simpleColor != color) {
            this.platform.log.info('Set light color of %s:%s to %s (%d, %d)', this.accessory.displayName, light.label, color, light.hue, light.brightness);
            light.simpleColor = color;
            const body = {
                channelIndex: light.index,
                deviceId: this.accessory.context.device.id,
                dimLevel: light.brightness / 100.0,
                simpleRGBColorState: light.simpleColor,
            };
            await this.platform.connector.apiCall('device/control/setSimpleRGBColorDimLevel', body);
        }
        callback(null);
    }
    async handleButton1LedHueSet(value, callback) {
        if (this.topLight.hasOpticalSignal) {
            this.topLight.hue = value;
            await this.buttonLedOpticalSignalSet(this.topLight, "AUTO", callback);
        }
        else if (this.topLight.hue != value) {
            this.topLight.hue = value;
            await this.buttonLedColorSet(this.topLight, callback);
        }
        else {
            callback(null);
        }
    }
    async handleButton2LedHueSet(value, callback) {
        if (this.bottomLight.hasOpticalSignal) {
            this.bottomLight.hue = value;
            await this.buttonLedOpticalSignalSet(this.bottomLight, "AUTO", callback);
        }
        else if (this.bottomLight.hue != value) {
            this.bottomLight.hue = value;
            await this.buttonLedColorSet(this.bottomLight, callback);
        }
        else {
            callback(null);
        }
    }
    /*
     * Light Saturation characteristic handlers
     */
    buttonLedSaturationGet(light) {
        this.platform.log.debug('Get light saturation of %s:%s (%d)', this.accessory.displayName, light.label, light.saturation);
        return light.saturation;
    }
    handleButton1LedSaturationGet(callback) {
        callback(null, this.buttonLedSaturationGet(this.topLight));
    }
    handleButton2LedSaturationGet(callback) {
        callback(null, this.buttonLedSaturationGet(this.bottomLight));
    }
    async handleButton1LedSaturationSet(value, callback) {
        if (this.topLight.hasOpticalSignal) {
            this.topLight.saturation = value;
            await this.buttonLedOpticalSignalSet(this.topLight, "AUTO", callback);
        }
        else if (this.topLight.saturation != value) {
            this.topLight.saturation = value;
            await this.buttonLedColorSet(this.topLight, callback);
        }
        else {
            callback(null);
        }
    }
    async handleButton2LedSaturationSet(value, callback) {
        if (this.bottomLight.hasOpticalSignal) {
            this.bottomLight.saturation = value;
            await this.buttonLedOpticalSignalSet(this.bottomLight, "AUTO", callback);
        }
        else if (this.bottomLight.saturation != value) {
            this.bottomLight.saturation = value;
            await this.buttonLedColorSet(this.bottomLight, callback);
        }
        else {
            callback(null);
        }
    }
    /*
     * Light OpticalSignal characteristic handlers
     */
    buttonLedOpticalSignalGet(light) {
        this.platform.log.debug('Get optical signal of %s:%s (%s)', this.accessory.displayName, light.label, light.opticalSignal);
        return light.opticalSignal;
    }
    handleButton1LedOpticalSignalGet(callback) {
        callback(null, this.buttonLedOpticalSignalGet(this.topLight));
    }
    handleButton2LedOpticalSignalGet(callback) {
        callback(null, this.buttonLedOpticalSignalGet(this.bottomLight));
    }
    async buttonLedOpticalSignalSet(light, value, callback) {
        if (value == 'AUTO') {
            if (light.opticalSignal === 'OFF' && light.brightness > 0) {
                value = 'ON';
            }
            else if (light.brightness == 0) {
                value = 'OFF';
            }
            else {
                value = light.opticalSignal;
            }
        }
        const color = this.getNearestHmIPColorFromHSL(light.hue, light.saturation, light.lightness);
        if (light.simpleColor != color || light.opticalSignal != value) {
            if (light.opticalSignal !== value) {
                this.platform.log.info('Set optical signal of %s:%s to %s', this.accessory.displayName, light.label, value);
            }
            else if (light.simpleColor !== color) {
                this.platform.log.info('Set light color of %s:%s to %s (%d, %d)', this.accessory.displayName, light.label, color, light.hue, light.brightness);
            }
            light.simpleColor = color;
            light.opticalSignal = value.toUpperCase();
            if (light.hasOpticalSignal) {
                const body = {
                    channelIndex: light.index,
                    deviceId: this.accessory.context.device.id,
                    opticalSignalBehaviour: light.opticalSignal,
                    dimLevel: light.brightness / 100.0,
                    simpleRGBColorState: light.simpleColor,
                };
                await this.platform.connector.apiCall('device/control/setOpticalSignal', body);
            }
            else {
                this.platform.log.info('Setting optical signal of %s:%s not supported', this.accessory.displayName, light.label);
            }
        }
        callback(null);
    }
    async handleButton1LedOpticalSignalSet(value, callback) {
        await this.buttonLedOpticalSignalSet(this.topLight, value, callback);
    }
    async handleButton2LedOpticalSignalSet(value, callback) {
        await this.buttonLedOpticalSignalSet(this.bottomLight, value, callback);
    }
    /*
     * Update state of lights
     */
    updateLightState(light, channel) {
        if (light.index === channel.index && light.service !== undefined) {
            if (light.label !== channel.label) {
                light.label = channel.label;
                this.platform.log.debug('Update light label of %s to %s', this.accessory.displayName, light.label);
                light.service.displayName = light.label;
                light.service.updateCharacteristic(this.platform.Characteristic.Name, light.label);
            }
            if (light.on !== channel.on) {
                light.on = channel.on;
                this.platform.log.debug('Update light state of %s:%s to %s', this.accessory.displayName, light.label, light.on ? 'ON' : 'OFF');
                light.service.updateCharacteristic(this.platform.Characteristic.On, light.on);
            }
            light.hasOpticalSignal = false;
            if (channel.supportedOptionalFeatures !== undefined) {
                const supportedFeatures = channel.supportedOptionalFeatures;
                if (supportedFeatures !== null && supportedFeatures.IFeatureOpticalSignalBehaviourState !== undefined) {
                    light.hasOpticalSignal = supportedFeatures.IFeatureOpticalSignalBehaviourState;
                }
            }
            const brightness = channel.dimLevel * 100.0;
            if (brightness !== null && brightness !== light.brightness) {
                light.brightness = brightness;
                this.platform.log.debug('Update light brightness of %s:%s to %s %%', this.accessory.displayName, light.label, light.brightness.toFixed(0));
                light.service.updateCharacteristic(this.platform.Characteristic.Brightness, light.brightness);
            }
            if (light.simpleColor !== channel.simpleRGBColorState) {
                const newColor = channel.simpleRGBColorState;
                this.platform.log.debug('Update light color of %s:%s to %s', this.accessory.displayName, light.label, newColor);
                const hsl = HmIPColorPaletteHSL.get(newColor);
                if (hsl !== undefined) {
                    light.simpleColor = newColor;
                    if (newColor !== 'BLACK') {
                        light.hue = hsl[0];
                        light.saturation = hsl[1];
                        light.lightness = hsl[2];
                        light.service.updateCharacteristic(this.platform.Characteristic.Hue, light.hue);
                        light.service.updateCharacteristic(this.platform.Characteristic.Saturation, light.saturation);
                    }
                }
                else {
                    this.platform.log.error('Light color not supported for %s:%s', this.accessory.displayName, light.label);
                }
            }
            if (light.hasOpticalSignal) {
                const opticalSignal = channel.opticalSignalBehaviour;
                if (opticalSignal !== null && opticalSignal !== light.opticalSignal) {
                    light.opticalSignal = opticalSignal;
                    this.platform.log.debug('Update optical signal of %s:%s to %s', this.accessory.displayName, light.label, light.opticalSignal);
                    light.service.updateCharacteristic(this.platform.customCharacteristic.characteristic.OpticalSignal, light.opticalSignal);
                }
            }
            else {
                this.platform.log.info('Optical signal not supported for %s:%s', this.accessory.displayName, light.label);
            }
        }
    }
    updateDevice(hmIPDevice, groups) {
        super.updateDevice(hmIPDevice, groups);
        for (const id in hmIPDevice.functionalChannels) {
            const channel = hmIPDevice.functionalChannels[id];
            //this.platform.log.info(`Switch update: ${JSON.stringify(channel)}`);
            if (channel.functionalChannelType === 'SWITCH_CHANNEL') {
                const switchChannel = channel;
                this.platform.log.debug(`Switch update: ${JSON.stringify(channel)}`);
                if (switchChannel.on !== null && switchChannel.on !== this.on) {
                    this.on = switchChannel.on;
                    this.platform.log.info('Switch state of %s changed to %s', this.accessory.displayName, this.on ? 'ON' : 'OFF');
                    this.service.updateCharacteristic(this.platform.Characteristic.On, this.on);
                }
            }
            if (channel.functionalChannelType === 'NOTIFICATION_LIGHT_CHANNEL' && !this.simpleSwitch) {
                const notificationLightChannel = channel;
                this.updateLightState(this.topLight, notificationLightChannel);
                this.updateLightState(this.bottomLight, notificationLightChannel);
            }
        }
    }
    /*
     * Loop over HmIPColorPaletteHSL and find nearest color to a given HSL
     */
    getNearestHmIPColorFromHSL(h, s, l) {
        let minDistance = 360;
        let nearestHmIPColor;
        for (const [key, value] of HmIPColorPaletteHSL) {
            const hsb = value;
            const dh = Math.min(Math.abs(h - hsb[0]), 360 - Math.abs(h - hsb[0])) / 180.0;
            const ds = Math.abs(s - hsb[1]) / 100.0;
            const dl = Math.abs(l - hsb[2]) / 100.0;
            const distance = Math.sqrt(dh * dh + ds * ds + dl * dl);
            if (distance <= minDistance) {
                minDistance = distance;
                nearestHmIPColor = key;
            }
        }
        this.platform.log.debug('getNearestHmIPColorFromHSL() for h:%s s:%s l:%s is %s with distance %s', h, s, l, nearestHmIPColor, minDistance);
        return nearestHmIPColor;
    }
}
//# sourceMappingURL=HmIPSwitchNotificationLight.js.map