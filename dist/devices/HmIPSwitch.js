import { HmIPGenericDevice } from './HmIPGenericDevice.js';
/**
 * HomematicIP switch
 *
 * Switches
 *
 * HMIP-PS (Pluggable Switch)
 * HMIP-FSI16 (Full Flush Input Switch)
 * HMIP-PCBS (Switch Circuit Board - 1 channel)
 * HMIP-PCBS-BAT (Printed Circuit Board Switch Battery)
 * HMIP-PCBS2 (Switch Circuit Board - 2x channels)
 * HMIP-MOD-OC8 ( Open Collector Module )
 * HMIP-WHS2 (Switch Actuator for heating systems – 2x channels)
 * HMIPW-DRS8 (Homematic IP Wired Switch Actuator – 8x channels)
 * HMIP-DRSI4 (Homematic IP Switch Actuator for DIN rail mount – 4x channels) """
 *
 */
export class HmIPSwitch extends HmIPGenericDevice {
    service;
    on = false;
    constructor(platform, accessory) {
        super(platform, accessory);
        this.platform.log.debug(`Created switch ${accessory.context.device.label}`);
        this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);
        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.label);
        this.updateDevice(accessory.context.device, platform.groups);
        this.service.getCharacteristic(this.platform.Characteristic.On)
            .on('get', this.handleOnGet.bind(this))
            .on('set', this.handleOnSet.bind(this));
    }
    handleOnGet(callback) {
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
    updateDevice(hmIPDevice, groups) {
        super.updateDevice(hmIPDevice, groups);
        for (const id in hmIPDevice.functionalChannels) {
            const channel = hmIPDevice.functionalChannels[id];
            if (channel.functionalChannelType === 'SWITCH_CHANNEL') {
                const switchChannel = channel;
                this.platform.log.debug(`Switch update: ${JSON.stringify(channel)}`);
                if (switchChannel.on !== null && switchChannel.on !== this.on) {
                    this.on = switchChannel.on;
                    this.platform.log.info('Switch state of %s changed to %s', this.accessory.displayName, this.on ? 'ON' : 'OFF');
                    this.service.updateCharacteristic(this.platform.Characteristic.On, this.on);
                }
            }
        }
    }
}
//# sourceMappingURL=HmIPSwitch.js.map