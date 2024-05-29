import { HmIPGenericDevice } from './HmIPGenericDevice.js';
/**
 * HomematicIP switch (measuring)
 *
 * HmIP-PSM (Pluggable Switch and Meter)
 * HmIP-BSM (Brand Switch and Meter)
 * HmIP-FSM, HMIP-FSM16 (Full flush Switch and Meter)
 *
 */
export class HmIPSwitchMeasuring extends HmIPGenericDevice {
    service;
    on = false;
    energyCounter = 0;
    currentPowerConsumption = 0;
    constructor(platform, accessory) {
        super(platform, accessory);
        this.platform.log.debug('Created switch (measuring) %s', accessory.context.device.label);
        this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);
        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.label);
        this.service.addOptionalCharacteristic(this.platform.customCharacteristic.characteristic.ElectricPower);
        this.service.addOptionalCharacteristic(this.platform.customCharacteristic.characteristic.ElectricalEnergy);
        this.updateDevice(accessory.context.device, platform.groups);
        this.service.getCharacteristic(this.platform.Characteristic.On)
            .on('get', this.handleOnGet.bind(this))
            .on('set', this.handleOnSet.bind(this));
        this.service.getCharacteristic(this.platform.customCharacteristic.characteristic.ElectricPower)
            .on('get', this.handleElectricPowerGet.bind(this));
        this.service.getCharacteristic(this.platform.customCharacteristic.characteristic.ElectricalEnergy)
            .on('get', this.handleElectricalEnergyGet.bind(this));
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
    handleElectricPowerGet(callback) {
        callback(null, this.currentPowerConsumption);
    }
    handleElectricalEnergyGet(callback) {
        callback(null, this.energyCounter);
    }
    updateDevice(hmIPDevice, groups) {
        super.updateDevice(hmIPDevice, groups);
        for (const id in hmIPDevice.functionalChannels) {
            const channel = hmIPDevice.functionalChannels[id];
            if (channel.functionalChannelType === 'SWITCH_MEASURING_CHANNEL') {
                const switchMeasuringChannel = channel;
                this.platform.log.debug('Switch (measuring) update: %s', JSON.stringify(channel));
                if (switchMeasuringChannel.on != null && switchMeasuringChannel.on !== this.on) {
                    this.on = switchMeasuringChannel.on;
                    this.platform.log.info('Switch state of %s changed to %s', this.accessory.displayName, this.on ? 'ON' : 'OFF');
                    this.service.updateCharacteristic(this.platform.Characteristic.On, this.on);
                }
                if (switchMeasuringChannel.currentPowerConsumption !== null
                    && switchMeasuringChannel.currentPowerConsumption !== this.currentPowerConsumption) {
                    this.currentPowerConsumption = switchMeasuringChannel.currentPowerConsumption;
                    this.platform.log.debug('Switch power consumption of %s changed to %s W', this.accessory.displayName, this.currentPowerConsumption.toFixed(1));
                    this.service.updateCharacteristic(this.platform.customCharacteristic.characteristic.ElectricPower, this.currentPowerConsumption);
                }
                if (switchMeasuringChannel.energyCounter !== null && switchMeasuringChannel.energyCounter !== this.energyCounter) {
                    this.energyCounter = switchMeasuringChannel.energyCounter;
                    this.platform.log.debug('Switch energy counter of %s changed to %s kWh', this.accessory.displayName, this.energyCounter.toFixed(3));
                    this.service.updateCharacteristic(this.platform.customCharacteristic.characteristic.ElectricalEnergy, this.energyCounter);
                }
            }
        }
    }
}
//# sourceMappingURL=HmIPSwitchMeasuring.js.map