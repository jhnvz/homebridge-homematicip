export class CustomCharacteristic {
    api;
    characteristic = {};
    constructor(api) {
        this.api = api;
        this.createCharacteristics('OpticalSignal', 'a11c14a7-bb9b-4085-8597-68cf63964bf8', {
            format: "string" /* Formats.STRING */,
            perms: ["ev" /* Perms.NOTIFY */, "pw" /* Perms.PAIRED_WRITE */, "pr" /* Perms.PAIRED_READ */],
        });
        this.createCharacteristics('ElectricPower', 'E863F10D-079E-48FF-8F27-9C2605A29F52', {
            format: "float" /* Formats.FLOAT */,
            perms: ["ev" /* Perms.NOTIFY */, "pr" /* Perms.PAIRED_READ */],
        }, 'Electric Power');
        this.createCharacteristics('ElectricalEnergy', 'E863F10C-079E-48FF-8F27-9C2605A29F52', {
            format: "float" /* Formats.FLOAT */,
            perms: ["ev" /* Perms.NOTIFY */, "pr" /* Perms.PAIRED_READ */],
        }, 'Electrical Energy');
        this.createCharacteristics('ValvePosition', 'E863F12E-079E-48FF-8F27-9C2605A29F52', {
            format: "uint8" /* Formats.UINT8 */,
            unit: "percentage" /* Units.PERCENTAGE */,
            perms: ["pr" /* Perms.PAIRED_READ */, "ev" /* Perms.NOTIFY */],
            minValue: 0,
            maxValue: 100
        }, 'Valve Position');
        this.createCharacteristics('RainBool', 'F14EB1AD-E000-4EF4-A54F-0CF07B2E7BE7', {
            format: "bool" /* Formats.BOOL */,
            perms: ["pr" /* Perms.PAIRED_READ */, "ev" /* Perms.NOTIFY */]
        });
        this.createCharacteristics('RainDay', 'ccc04890-565b-4376-b39a-3113341d9e0f', {
            format: "float" /* Formats.FLOAT */,
            unit: 'mm',
            minValue: 0,
            maxValue: 500,
            minStep: 0.1,
            perms: ["pr" /* Perms.PAIRED_READ */, "ev" /* Perms.NOTIFY */]
        });
        this.createCharacteristics('WindDirection', '46f1284c-1912-421b-82f5-eb75008b167e', {
            format: "string" /* Formats.STRING */,
            perms: ["pr" /* Perms.PAIRED_READ */, "ev" /* Perms.NOTIFY */]
        });
        this.createCharacteristics('WindSpeed', '49C8AE5A-A3A5-41AB-BF1F-12D5654F9F41', {
            unit: 'km/h',
            format: "uint8" /* Formats.UINT8 */,
            minValue: 0,
            minStep: 0.1,
            maxValue: 100,
            perms: ["pr" /* Perms.PAIRED_READ */, "ev" /* Perms.NOTIFY */]
        });
        this.createCharacteristics('WeatherConditionCategory', 'CD65A9AB-85AD-494A-B2BD-2F380084134C', {
            format: "uint16" /* Formats.UINT16 */,
            minValue: 0,
            minStep: 1,
            maxValue: 100,
            perms: ["pr" /* Perms.PAIRED_READ */, "ev" /* Perms.NOTIFY */]
        });
    }
    createCharacteristics(key, uuid, props, displayName = key) {
        this.characteristic[key] = class extends this.api.hap.Characteristic {
            static UUID = uuid;
            constructor() {
                super(displayName, uuid, props);
                this.value = this.getDefaultValue();
            }
        };
    }
}
//# sourceMappingURL=CustomCharacteristic.js.map