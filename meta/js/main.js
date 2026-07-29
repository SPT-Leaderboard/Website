//     _____ ____  ______   __    _________    ____  __________  ____  ____  ___    ____  ____ 
//    / ___// __ \/_  __/  / /   / ____/   |  / __ \/ ____/ __ \/ __ )/ __ \/   |  / __ \/ __ \
//    \__ \/ /_/ / / /    / /   / __/ / /| | / / / / __/ / /_/ / __  / / / / /| | / /_/ / / / /  
//   ___/ / ____/ / /    / /___/ /___/ ___ |/ /_/ / /___/ _, _/ /_/ / /_/ / ___ |/ _, _/ /_/ / 
//  /____/_/     /_/    /_____/_____/_/  |_/_____/_____/_/ |_/_____/\____/_/  |_/_/ |_/_____/  

let allWeapons = [];
let allEquipmentData = {};
let weaponAttachmentsMap = new Map();

const weaponCategories = {
    // Assault carabines
    "644674a13d52156624001fbc": { main: "Primary Weapons", sub: "Assault Carabines", caliber: "9x39mm" }, // 9A-91
    "5c07c60e0db834002330051f": { main: "Primary Weapons", sub: "Assault Carabines", caliber: "5.56x45mm NATO" }, // ADAR
    "6410733d5dd49d77bd07847e": { main: "Primary Weapons", sub: "Assault Carabines", caliber: "7.62x54mmR" }, // AVT-40
    "587e02ff24597743df3deaeb": { main: "Primary Weapons", sub: "Assault Carabines", caliber: "7.62x39mm" }, // SKS
    "5f2a9575926fd9352339381f": { main: "Primary Weapons", sub: "Assault Carabines", caliber: "7.62x51mm NATO" }, // RFB
    "628b5638ad252a16da6dd245": { main: "Primary Weapons", sub: "Assault Carabines", caliber: "5.45x39mm" }, // SAG AK
    "628b9c37a733087d0d7fe84b": { main: "Primary Weapons", sub: "Assault Carabines", caliber: "5.45x39mm" }, // SAG AK short
    "574d967124597745970e7c94": { main: "Primary Weapons", sub: "Assault Carabines", caliber: "7.62x39mm" }, // SKS
    "651450ce0e00edc794068371": { main: "Primary Weapons", sub: "Assault Carabines", caliber: "9x39mm" }, // SR-3M
    "643ea5b23db6f9f57107d9fd": { main: "Primary Weapons", sub: "Assault Carabines", caliber: "7.62x54mmR" }, // SVT-40
    "5d43021ca4b9362eab4b5e25": { main: "Primary Weapons", sub: "Assault Carabines", caliber: "5.56x45mm NATO" }, // TX-15
    "5c501a4d2e221602b412b540": { main: "Primary Weapons", sub: "Assault Carabines", caliber: "7.62x51mm NATO" }, // VPO-101
    "59e6152586f77473dc057aa1": { main: "Primary Weapons", sub: "Assault Carabines", caliber: "7.62x39mm" }, // VPO-136
    "59e6687d86f77411d949b251": { main: "Primary Weapons", sub: "Assault Carabines", caliber: ".366 TKM" }, // VPO-209
    "645e0c6b3b381ede770e1cc9": { main: "Primary Weapons", sub: "Assault Carabines", caliber: "9x39mm" }, // VSK

    "6499849fc93611967b034949": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "5.45x39mm" }, // AK-12
    "5bf3e03b0db834001d2c4a9c": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "5.45x39mm" }, // AK-74
    "5ac4cd105acfc40016339859": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "5.45x39mm" }, // AK-74M
    "5644bd2b4bdc2d3b4c8b4572": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "5.45x39mm" }, // AK-74N
    "5ab8e9fcd8ce870019439434": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "5.45x39mm" }, // AKS-74N
    "5ac66cb05acfc40198510a10": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "5.56x45mm NATO" }, // AK-101
    "5ac66d015acfc400180ae6e4": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "5.56x45mm NATO" }, // AK-102
    "5ac66d2e5acfc43b321d4b53": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "7.62x39mm" }, // AK-103
    "5ac66d725acfc43b321d4b60": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "7.62x39mm" }, // AK-104
    "5ac66d9b5acfc4001633997a": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "5.45x39mm" }, // AK-105
    "59d6088586f774275f37482f": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "7.62x39mm" }, // AKM
    "5a0ec13bfcdbcb00165aa685": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "7.62x39mm" }, // AKMN
    "59ff346386f77477562ff5e2": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "7.62x39mm" }, // AKMS
    "5abcbc27d8ce8700182eceeb": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "7.62x39mm" }, // AKMSN
    "5bf3e0490db83400196199af": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "5.45x39mm" }, // AKS-74
    "57dc2fa62459775949412633": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "5.45x39mm" }, // AKS-74U
    "5839a40f24597726f856b511": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "5.45x39mm" }, // AKS-74UB
    "583990e32459771419544dd2": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "5.45x39mm" }, // AKS-74UN
    "57c44b372459772d2b39b8ce": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "9x39mm" }, // AS VAL
    "5cadfbf7ae92152ac412eeef": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "12.7x55mm" }, // ASh-12
    "62e7c4fba689e8c9c50dfc38": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "5.56x45mm NATO" }, // AUG A1
    "6718817435e3cfd9550d2c27": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "5.56x45mm NATO" }, // AUG A3
    "5c488a752e221602b412af63": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "5.56x45mm NATO" }, // MDR
    "623063e994fc3f7b302a9696": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "5.56x45mm NATO" }, // G36
    "5bb2475ed4351e00853264e3": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "5.56x45mm NATO" }, // HK 416A5
    "5447a9cd4bdc2dbd208b4567": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "5.56x45mm NATO" }, // M4A1
    "5fbcc1d9016cce60e8341ab3": { main: "Primary Weapons", sub: "Assault Rifles", caliber: ".300 Blackout" }, // MCX .300 BLK
    "65290f395ae2ae97b80fdf2d": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "6.8x51mm" }, // SPEAR 6.8
    "606587252535c57a13424cfd": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "7.62x39mm" }, // Mk47
    "618428466ef05c2ce828f218": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "5.56x45mm NATO" }, // Mk16
    "6183afd850224f204c1da514": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "5.56x45mm NATO" }, // Mk17
    "628a60ae6b1d481ff772e9c8": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "7.62x39mm" }, // RD-704
    "5b0bbe4e5acfc40dc528a72d": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "7.62x51mm NATO" }, // SA58
    "676176d362e0497044079f4c": { main: "Primary Weapons", sub: "Assault Rifles", caliber: "7.62x51mm NATO" }, // X-17 (SCAR)
    "674d6121c09f69dfb201a888": { main: "Primary Weapons", sub: "Assault Rifles", caliber: ".300 Blackout" }, // Velociraptor .300 BLK
    // WTT
    "686093d590c3dce07984c38a": { main: "Primary Weapons", sub: "Assault Rifles WTT", caliber: "7.62x39mm", tag: "WTT" }, // AEK-973
    "6761b213607f9a6f79017c7e": { main: "Primary Weapons", sub: "Assault Rifles WTT", caliber: ".300 Blackout", tag: "WTT" }, // KAC PDW
    "664a5b945636ce820472f225": { main: "Primary Weapons", sub: "Assault Rifles WTT", caliber: "7.62x51mm NATO", tag: "WTT" }, // HK417
    "6671ebcdd32bd95eb398e920": { main: "Primary Weapons", sub: "Assault Rifles WTT", caliber: "5.56x45mm NATO", tag: "WTT" }, // AK5C
    "682d460e951a926af552d764": { main: "Primary Weapons", sub: "Assault Rifles WTT", caliber: "5.56x45mm NATO", tag: "WTT" }, // AK5C Custom
    "682d3dd16900cb35564c8825": { main: "Primary Weapons", sub: "Assault Rifles WTT", caliber: "5.56x45mm NATO", tag: "WTT" }, // AK5D
    "66839591f4d0cba7b041b2af": { main: "Primary Weapons", sub: "Assault Rifles WTT", caliber: "5.56x45mm NATO", tag: "WTT" }, // Patriot
    "67a01e4ea2b82626b73d10a3": { main: "Primary Weapons", sub: "Assault Rifles WTT", caliber: "5.56x45mm NATO", tag: "WTT" }, // ACR
    "66a545898022784400d6c836": { main: "Primary Weapons", sub: "Assault Rifles WTT", caliber: "5.56x45mm NATO", tag: "WTT" }, // Tavor X95
    "664274a4d2e5fe0439d545a6": { main: "Primary Weapons", sub: "Assault Rifles WTT", caliber: "7.62x51mm NATO", tag: "WTT" }, // G3
    "66ba249b102a9dd6040a6e7e": { main: "Primary Weapons", sub: "Assault Rifles WTT", caliber: "5.56x45mm NATO", tag: "WTT" }, // Carmel
    "676b4e2ff185a450a0b300b4": { main: "Primary Weapons", sub: "Assault Rifles WTT", caliber: "5.56x45mm NATO", tag: "WTT" }, // Wages Of Sin

    "627e14b21713922ded6f2c15": { main: "Primary Weapons", sub: "Bolt-action rifles", caliber: "8.6x70mm" }, // AXMC
    "588892092459774ac91d4b11": { main: "Primary Weapons", sub: "Bolt-action rifles", caliber: "7.62x51mm NATO" }, // DVL-10
    "5bfea6e90db834001b7347f3": { main: "Primary Weapons", sub: "Bolt-action rifles", caliber: "7.62x51mm NATO" }, // M700
    "5bfd297f0db834001a669119": { main: "Primary Weapons", sub: "Bolt-action rifles", caliber: "7.62x54mmR" }, // Mosin Infantry
    "5ae08f0a5acfc408fb1398a1": { main: "Primary Weapons", sub: "Bolt-action rifles", caliber: "7.62x54mmR" }, // Mosin Sniper
    "55801eed4bdc2d89578b4588": { main: "Primary Weapons", sub: "Bolt-action rifles", caliber: "7.62x54mmR" }, // SV-98
    "5df24cf80dee1b22f862e9bc": { main: "Primary Weapons", sub: "Bolt-action rifles", caliber: "7.62x51mm NATO" }, // T-5000M
    "673cab3e03c6a20581028bc1": { main: "Primary Weapons", sub: "Bolt-action rifles", caliber: "8.6x70mm" }, // TRG M10
    "5de652c31b7e3716273428be": { main: "Primary Weapons", sub: "Bolt-action rifles", caliber: ".366 TKM" }, // VPO-215 Gornostay
    // WTT
    "68a3836826dffa87b5767c04": { main: "Primary Weapons", sub: "Bolt-action rifles WTT", caliber: ".300 Winchester Magnum" }, // AXMC .300WM
    "684e32eaec9f5eb3cacc7ca7": { main: "Primary Weapons", sub: "Bolt-action rifles WTT", caliber: ".300 Winchester Magnum" }, // MSR

    "6176aca650224f204c1da3fb": { main: "Primary Weapons", sub: "Designated marksman rifles", caliber: "7.62x51mm NATO" }, // G28
    "5aafa857e5b5b00018480968": { main: "Primary Weapons", sub: "Designated marksman rifles", caliber: "7.62x51mm NATO" }, // M1A
    "5fc22d7c187fea44d52eda44": { main: "Primary Weapons", sub: "Designated marksman rifles", caliber: "8.6x70mm" }, // Mk-18
    "5a367e5dc4a282000e49738f": { main: "Primary Weapons", sub: "Designated marksman rifles", caliber: "7.62x51mm NATO" }, // RSASS
    "5df8ce05b11454561e39243b": { main: "Primary Weapons", sub: "Designated marksman rifles", caliber: "7.62x51mm NATO" }, // SR-25
    "5c46fbd72e2216398b5a8c9c": { main: "Primary Weapons", sub: "Designated marksman rifles", caliber: "7.62x54mmR" }, // SVDS
    "57838ad32459774a17445cd2": { main: "Primary Weapons", sub: "Designated marksman rifles", caliber: "9x39mm" }, // VSS Vintorez

    "5e81ebcd8e146c7080625e15": { main: "Primary Weapons", sub: "Grenade launchers", caliber: "40mm" }, // FN40GL
    "6275303a9f372d6ea97f9ec7": { main: "Primary Weapons", sub: "Grenade launchers", caliber: "40mm" }, // MSGL

    "661cec09b2c6356b4d0c7a36": { main: "Primary Weapons", sub: "Light machine guns", caliber: "7.62x51mm NATO" }, // M60E6
    "65fb023261d5829b2d090755": { main: "Primary Weapons", sub: "Light machine guns", caliber: "7.62x51mm NATO" }, // Mk 43 Mod 1
    "64637076203536ad5600c990": { main: "Primary Weapons", sub: "Light machine guns", caliber: "7.62x54mmR" }, // PKM
    "64ca3d3954fc657e230529cc": { main: "Primary Weapons", sub: "Light machine guns", caliber: "7.62x54mmR" }, // PKP
    "6513ef33e06849f06c0957ca": { main: "Primary Weapons", sub: "Light machine guns", caliber: "7.62x39mm" }, // RPD
    "65268d8ecb944ff1e90ea385": { main: "Primary Weapons", sub: "Light machine guns", caliber: "7.62x39mm" }, // RPDN
    "5beed0f50db834001c062b12": { main: "Primary Weapons", sub: "Light machine guns", caliber: "7.62x39mm" }, // RPK-16
    // WTT
    "66e718dc498d978477e0ba75": { main: "Primary Weapons", sub: "Light machine guns WTT", caliber: "5.56x45mm NATO", tag: "WTT" }, // M249

    "66ffa9b66e19cc902401c5e8": { main: "Primary Weapons", sub: "Shotguns", caliber: "12/70" }, // AA-12 Gen 1
    "67124dcfa3541f2a1f0e788b": { main: "Primary Weapons", sub: "Shotguns", caliber: "12/70" }, // AA-12 Gen 2
    "5e848cc2988a8701445df1e8": { main: "Primary Weapons", sub: "Shotguns", caliber: "23x75mmR" }, // KS-23M
    "6259b864ebedf17603599e88": { main: "Primary Weapons", sub: "Shotguns", caliber: "12/70" }, // M3 Super 90
    "5a7828548dc32e5a9c28b516": { main: "Primary Weapons", sub: "Shotguns", caliber: "12/70" }, // M870
    "5e870397991fd70db46995c8": { main: "Primary Weapons", sub: "Shotguns", caliber: "12/70" }, // 590A1
    "61f7c9e189e6fb1a5e3ea78d": { main: "Primary Weapons", sub: "Shotguns", caliber: "7.62x54mmR" }, // MP-18
    "5580223e4bdc2d1c128b457f": { main: "Primary Weapons", sub: "Shotguns", caliber: "12/70" }, // MP-43-1C
    "54491c4f4bdc2db1078b4568": { main: "Primary Weapons", sub: "Shotguns", caliber: "12/70" }, // MP-133
    "56dee2bdd2720bc8328b4567": { main: "Primary Weapons", sub: "Shotguns", caliber: "12/70" }, // MP-153
    "606dae0ab0e443224b421bb7": { main: "Primary Weapons", sub: "Shotguns", caliber: "12/70" }, // MP-155
    "60db29ce99594040e04c4a27": { main: "Primary Weapons", sub: "Shotguns", caliber: "12/70" }, // MTs-255-12
    "576165642459773c7a400233": { main: "Primary Weapons", sub: "Shotguns", caliber: "12/70" }, // Saiga-12K
    "674fe9a75e51f1c47c04ec23": { main: "Primary Weapons", sub: "Shotguns", caliber: "12/70" }, // Saiga-12K FA
    "5a38e6bac4a2826c6e06d79b": { main: "Primary Weapons", sub: "Shotguns", caliber: "20/70" }, // TOZ-106
    // WTT
    "6840ebf5b8687ba34f8dfbca": { main: "Primary Weapons", sub: "Shotguns WTT", caliber: "12/70", tag: "WTT" }, // Auto-5

    "5926bb2186f7744b1c6c6e60": { main: "Primary Weapons", sub: "Submachine guns", caliber: "9x19mm" }, // MP5
    "5d2f0d8048f0356c925bc3b0": { main: "Primary Weapons", sub: "Submachine guns", caliber: "9x19mm" }, // MP5K-N
    "5ba26383d4351e00334c93d9": { main: "Primary Weapons", sub: "Submachine guns", caliber: "4.6x30mm" }, // MP7A1
    "5bd70322209c4d00d7167b8f": { main: "Primary Weapons", sub: "Submachine guns", caliber: "4.6x30mm" }, // MP7A2
    "5e00903ae9dc277128008b87": { main: "Primary Weapons", sub: "Submachine guns", caliber: "9x19mm" }, // MP9
    "5de7bd7bfd6b4e6e2276dc25": { main: "Primary Weapons", sub: "Submachine guns", caliber: "9x19mm" }, // MP9-N
    "58948c8e86f77409493f7266": { main: "Primary Weapons", sub: "Submachine guns", caliber: "9x19mm" }, // MPX
    "5cc82d76e24e8d00134b4b83": { main: "Primary Weapons", sub: "Submachine guns", caliber: "5.7x28mm" }, // P90

    "57f4c844245977379d5c14d1": { main: "Primary Weapons", sub: "Submachine guns", caliber: "9x18mm" }, // PP-9 Klin
    "59984ab886f7743e98271174": { main: "Primary Weapons", sub: "Submachine guns", caliber: "9x19mm" }, // PP-19-01
    "57d14d2524597714373db789": { main: "Primary Weapons", sub: "Submachine guns", caliber: "9x18mm" }, // PP-91 Kedr
    "57f3c6bd24597738e730fa2f": { main: "Primary Weapons", sub: "Submachine guns", caliber: "9x18mm" }, // PP-91-01 Kedr-B
    "5ea03f7400685063ec28bfa8": { main: "Primary Weapons", sub: "Submachine guns", caliber: "7.62x25mm" }, // PPSh-41
    "59f9cabd86f7743a10721f46": { main: "Primary Weapons", sub: "Submachine guns", caliber: "9x19mm" }, // Saiga-9
    "62e14904c2699c0ec93adc47": { main: "Primary Weapons", sub: "Submachine guns", caliber: "9x21mm" }, // SR-2M
    "60339954d62c9b14ed777c06": { main: "Primary Weapons", sub: "Submachine guns", caliber: "9x19mm" }, // STM-9
    "5fc3e272f8b6a877a729eac5": { main: "Primary Weapons", sub: "Submachine guns", caliber: ".45 ACP" }, // UMP 45
    "66992b349950f5f4cd06029f": { main: "Primary Weapons", sub: "Submachine guns", caliber: "9x19mm" }, // UZI
    "6680304edadb7aa61d00cef0": { main: "Primary Weapons", sub: "Submachine guns", caliber: "9x19mm" }, // UZI PRO Pistol
    "668e71a8dadf42204c032ce1": { main: "Primary Weapons", sub: "Submachine guns", caliber: "9x19mm" }, // UZI PRO SMG
    "5fb64bc92b1b027b1f50bcf2": { main: "Primary Weapons", sub: "Submachine guns", caliber: ".45 ACP" }, // Vector .45
    "5fc3f2d5900b1d5091531e57": { main: "Primary Weapons", sub: "Submachine guns", caliber: "9x19mm" }, // Vector 9x19
    // WTT
    "687afda52dc9fd6c0e14c602": { main: "Primary Weapons", sub: "Submachine guns WTT", caliber: "9x19mm" }, // EVO 3
    "6761b213607f9a6f79017cd8": { main: "Primary Weapons", sub: "Submachine guns WTT", caliber: "9x19mm" }, // PM-9

    "62e7e7bbe6da9612f743f1e0": { main: "Secondary weapons", sub: "Underbarrels", caliber: "40mm" }, // GP-25

    "5abccb7dd8ce87001773e277": { main: "Secondary weapons", sub: "Pistols", caliber: "9x18mm" }, // APB
    "56e0598dd2720bb5668b45a6": { main: "Secondary weapons", sub: "Pistols", caliber: "9x18mm" }, // PB
    "5a17f98cfcdbcb0980087290": { main: "Secondary weapons", sub: "Pistols", caliber: "9x18mm" }, // APS
    "66015072e9f84d5680039678": { main: "Secondary weapons", sub: "Pistols", caliber: "20x1" }, // Blicky
    "669fa409933e898cce0c2166": { main: "Secondary weapons", sub: "Pistols", caliber: ".357 Magnum" }, // Desert Eagle L5 .357
    "669fa39b48fc9f8db6035a0c": { main: "Secondary weapons", sub: "Pistols", caliber: ".50 Action Express" }, // Desert Eagle L6
    "668fe5a998b5ad715703ddd6": { main: "Secondary weapons", sub: "Pistols", caliber: ".50 Action Express" }, // Desert Eagle Mk XIX
    "5d3eb3b0a4b93615055e84d2": { main: "Secondary weapons", sub: "Pistols", caliber: "5.7x28mm" }, // FN 5-7
    "5d67abc1a4b93614ec50137f": { main: "Secondary weapons", sub: "Pistols", caliber: "5.7x28mm" }, // FN 5-7 FDE
    "5a7ae0c351dfba0017554310": { main: "Secondary weapons", sub: "Pistols", caliber: "9x19mm" }, // Glock 17
    "5b1fa9b25acfc40018633c01": { main: "Secondary weapons", sub: "Pistols", caliber: "9x19mm" }, // Glock 18C
    "63088377b5cd696784087147": { main: "Secondary weapons", sub: "Pistols", caliber: "9x19mm" }, // Glock 19X
    "5cadc190ae921500103bb3b6": { main: "Secondary weapons", sub: "Pistols", caliber: "9x19mm" }, // M9A3
    "5f36a0e5fbf956000b716b65": { main: "Secondary weapons", sub: "Pistols", caliber: ".45 ACP" }, // M45A1
    "5e81c3cbac2bb513793cdc75": { main: "Secondary weapons", sub: "Pistols", caliber: ".45 ACP" }, // M1911A1
    "576a581d2459771e7b1bc4f1": { main: "Secondary weapons", sub: "Pistols", caliber: "9x19mm" }, // MP-443 Grach
    "56d59856d2720bd8418b456a": { main: "Secondary weapons", sub: "Pistols", caliber: "9x19mm" }, // P226R
    "602a9740da11d6478d5a06dc": { main: "Secondary weapons", sub: "Pistols", caliber: "9x19mm" }, // PL-15
    "579204f224597773d619e051": { main: "Secondary weapons", sub: "Pistols", caliber: "9x18mm" }, // PM (t) pistol
    "5448bd6b4bdc2dfc2f8b4569": { main: "Secondary weapons", sub: "Pistols", caliber: "9x18mm" }, // PM
    "59f98b4986f7746f546d2cef": { main: "Secondary weapons", sub: "Pistols", caliber: "9x21mm" }, // SR-1MP Gyurza
    "571a12c42459771f627b58a0": { main: "Secondary weapons", sub: "Pistols", caliber: "7.62x25mm" }, // TT
    "5b3b713c5acfc4330140bd8d": { main: "Secondary weapons", sub: "Pistols", caliber: "7.62x25mm" }, // TT Gold
    "6193a720f8ee7e52e42109ed": { main: "Secondary weapons", sub: "Pistols", caliber: ".45 ACP" }, // USP .45
    // WTT
    "68433b58a8f9a618b11082d4": { main: "Secondary weapons", sub: "Pistols WTT", caliber: "4.6x30mm" }, // UCP
    "675ceb83e25d80bc676e15a6": { main: "Secondary weapons", sub: "Pistols WTT", caliber: "4.6x30mm" }, // Prodigy
    "6761b213607f9a6f79017d52": { main: "Secondary weapons", sub: "Pistols WTT", caliber: "9x19mm" }, // EDC X9
    "679f2453d1970258c1df3fce": { main: "Secondary weapons", sub: "Pistols WTT", caliber: "9x19mm" }, // C-9

    "61a4c8884f95bc3b2c5dc96f": { main: "Secondary weapons", sub: "Revolvers", caliber: ".357 Magnum" }, // CR 50DS
    "624c2e8614da335f1e034d8c": { main: "Secondary weapons", sub: "Revolvers", caliber: "9x19mm" }, // CR 200DS
    "633ec7c2a6918cb895019c6c": { main: "Secondary weapons", sub: "Revolvers", caliber: "12.7x55mm" }, // RSh-12
    "64748cb8de82c85eaf0a273a": { main: "Secondary weapons", sub: "Shotguns", caliber: "12/70" }, // MP-43 sawed-off

    "5d52cc5ba4b9367408500062": { main: "Stationary weapons", sub: "Automatic grenade launchers", caliber: "30x29mm" }, // AGS-30
    "5cdeb229d7f00c000e7ce174": { main: "Stationary weapons", sub: "Heavy machine guns", caliber: "12.7x108mm" }, // NSV Utyos

    "5710c24ad2720bc3458b45a3": { main: "Throwable weapons", sub: "Fragmentation grenades", caliber: "" }, // F-1
    "58d3db5386f77426186285a0": { main: "Throwable weapons", sub: "Fragmentation grenades", caliber: "" }, // M67
    "617fd91e5539a84ec44ce155": { main: "Throwable weapons", sub: "Fragmentation grenades", caliber: "" }, // RGN
    "618a431df1eb8e24b8741deb": { main: "Throwable weapons", sub: "Fragmentation grenades", caliber: "" } // RGO
};

document.addEventListener('DOMContentLoaded', async function () {
    runWeaponBuilder();

    document.getElementById('weaponSearch').addEventListener('input', filterWeapons);
    document.getElementById('mainCategory').addEventListener('change', function () {
        populateSubCategories();
        populateCalibers();
        filterWeapons();
    });
    document.getElementById('subCategory').addEventListener('change', function () {
        populateCalibers();
        filterWeapons();
    });
    document.getElementById('caliberFilter').addEventListener('change', filterWeapons);
});

async function runWeaponBuilder() {
    apiFetch(ApiPaths.weaponStatsPath, {
        method: 'GET',
        cacheBust: true,
        showErrorToast: true,
        timeout: 10000
    }).then(weaponData => {
        if (weaponData !== null) {
            processWeaponData(weaponData).then(() => {
                // Use whenever we want to use leaderboardData
                initEngine();

                waitForDataReady(() => loadEquipmentData());
            });
        }
    });
}

async function loadEquipmentData() {
    apiFetch(ApiPaths.equipmentBlobStatsPath, {
        method: 'GET',
        cacheBust: true,
        showErrorToast: true,
        timeout: 10000
    }).then(data => {
        if (data !== null) {
            allEquipmentData = data;
            processWeaponDataWithAttachments(data);
        }
    });
}

async function processWeaponData(weaponData) {
    const weaponMap = new Map();

    // Get all maps and weapons info
    for (const userId in weaponData.weapons) {
        const userData = weaponData.weapons[userId];
        const userLevel = userData.level || 0;
        const userName = userData.name || 'Unknown';
        const userMaps = userData.playedMaps || {};

        // store object reference
        let playerObject = null;
        if (window.findPlayerByPermaLink) {
            playerObject = window.findPlayerByPermaLink(userId);
        }

        // Weapons
        if (userData.weapons) {
            for (const weaponName in userData.weapons) {
                const cleanWeaponName = cleanWeaponNameFunc(weaponName);

                const weaponInfo = userData.weapons[weaponName];
                const stats = weaponInfo.stats;

                if (!weaponMap.has(cleanWeaponName)) {
                    weaponMap.set(cleanWeaponName, {
                        kills: 0,
                        headshots: 0,
                        totalShots: 0,
                        timesLost: 0,
                        levels: [],
                        originalIds: [],
                        maps: {},
                        players: [],
                        playerObjects: []
                    });
                }

                const weaponEntry = weaponMap.get(cleanWeaponName);
                weaponEntry.kills += stats.kills;
                weaponEntry.headshots += stats.headshots;
                weaponEntry.totalShots += stats.totalShots;
                weaponEntry.timesLost += stats.timesLost;
                weaponEntry.levels.push(userLevel);

                // Add info about player with playerObject reference
                const playerInfo = {
                    id: userId,
                    name: userName,
                    level: userLevel,
                    kills: stats.kills,
                    headshots: stats.headshots,
                    totalShots: stats.totalShots,
                    timesLost: stats.timesLost,
                    playerObject: playerObject
                };
                weaponEntry.players.push(playerInfo);

                if (playerObject) {
                    weaponEntry.playerObjects.push(playerObject);
                }

                if (weaponInfo.originalId) {
                    weaponEntry.originalIds.push(weaponInfo.originalId);
                }

                // Maps
                if (userData.playedMaps) {
                    for (const mapName in userMaps) {
                        if (!weaponEntry.maps[mapName]) {
                            weaponEntry.maps[mapName] = 0;
                        }
                        weaponEntry.maps[mapName] += userMaps[mapName];
                    }
                }
            }
        }
    }

    allWeapons = Array.from(weaponMap.entries()).map(([name, stats]) => {
        const avgLevel = stats.levels.length > 0
            ? stats.levels.reduce((sum, level) => sum + level, 0) / stats.levels.length
            : 0;

        const topMaps = Object.entries(stats.maps)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([mapName]) => mapName);

        // Find top 5
        const topPlayers = stats.players
            .sort((a, b) => b.kills - a.kills)
            .slice(0, 5)
            .map(player => ({
                ...player,
                playerObject: player.playerObject || null
            }));

        // Set weapon categories
        let mainCategory = "Unknown";
        let subCategory = "Unknown";
        let originalWeaponId = 0;

        if (stats.originalIds.length > 0) {
            originalWeaponId = stats.originalIds.reduce((a, b, i, arr) =>
                (arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b));

            const categoryInfo = weaponCategories[originalWeaponId];
            if (categoryInfo) {
                mainCategory = categoryInfo.main;
                subCategory = categoryInfo.sub;
            }
        }

        let caliber = "No caliber";
        if (stats.originalIds.length > 0) {
            originalWeaponId = stats.originalIds.reduce((a, b, i, arr) =>
                (arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b));

            const categoryInfo = weaponCategories[originalWeaponId];
            if (categoryInfo) {
                caliber = categoryInfo.caliber || "No caliber";
            }
        }

        return {
            name: cleanWeaponNameFunc(name),
            originalId: originalWeaponId,
            mainCategory,
            subCategory,
            caliber,
            kills: stats.kills,
            headshots: stats.headshots,
            totalShots: stats.totalShots,
            timesLost: stats.timesLost,
            avgLevel: Math.round(avgLevel),
            playerCount: stats.levels.length,
            killsPercent: stats.totalShots > 0
                ? ((stats.kills / stats.totalShots) * 100).toFixed(2)
                : 0,
            headshotsPercent: stats.kills > 0
                ? ((stats.headshots / stats.kills) * 100).toFixed(2)
                : 0,
            avgShots: stats.kills > 0
                ? (stats.totalShots / stats.kills).toFixed(2)
                : 0,
            survivalRate: (stats.timesLost + stats.kills) > 0
                ? (stats.kills / (stats.timesLost + stats.kills) * 100).toFixed(2)
                : 0,    // NOT a survival rate but is meant for total times lost 
            topMaps, // Top 3 maps for each weapon
            topPlayers,
            allPlayers: stats.players,
            playerObjects: stats.playerObjects
        };
    });

    // Sort by kills
    allWeapons.sort((a, b) => b.kills - a.kills);

    return true;
}

function filterWeapons() {
    const searchTerm = document.getElementById('weaponSearch').value.toLowerCase();
    const mainCategory = document.getElementById('mainCategory').value;
    const subCategory = document.getElementById('subCategory').value;
    const caliber = document.getElementById('caliberFilter').value;

    const weaponCards = document.querySelectorAll('.weapon-card');

    weaponCards.forEach(card => {
        const weaponName = card.querySelector('.weapon-name').textContent.toLowerCase();
        const weaponMainCat = card.dataset.mainCategory;
        const weaponSubCat = card.dataset.subCategory;
        const weaponCaliber = card.dataset.caliber;

        const nameMatch = weaponName.includes(searchTerm);
        const mainCatMatch = mainCategory === 'all' ||
            weaponMainCat.toLowerCase() === mainCategory.toLowerCase();
        const subCatMatch = subCategory === 'all' ||
            weaponSubCat.toLowerCase() === subCategory.toLowerCase();
        const caliberMatch = caliber === 'all' ||
            weaponCaliber.toLowerCase() === caliber.toLowerCase();

        card.style.display = (nameMatch && mainCatMatch && subCatMatch && caliberMatch)
            ? 'block' : 'none';
    });
}

function populateSubCategories() {
    const mainCategory = document.getElementById('mainCategory').value;
    const subCategorySelect = document.getElementById('subCategory');

    subCategorySelect.innerHTML = '<option value="all">All Subcategories</option>';

    if (mainCategory === 'all') {
        subCategorySelect.disabled = true;
        return;
    }

    subCategorySelect.disabled = false;

    // Get all subs
    const subCategories = new Set();
    allWeapons.forEach(weapon => {
        // Compare
        if (weapon.mainCategory.toLowerCase() === mainCategory.toLowerCase() && weapon.subCategory) {
            subCategories.add(weapon.subCategory);
        }
    });

    // Sort before adding
    Array.from(subCategories).sort().forEach(subCat => {
        const option = document.createElement('option');
        option.value = subCat;
        option.textContent = subCat;
        subCategorySelect.appendChild(option);
    });
}

function populateCalibers() {
    const mainCategory = document.getElementById('mainCategory').value;
    const subCategory = document.getElementById('subCategory').value;
    const caliberSelect = document.getElementById('caliberFilter');

    caliberSelect.innerHTML = '<option value="all">All Calibers</option>';

    // If main category is All, show all calibers
    if (mainCategory === 'all') {
        const allCalibers = new Set();
        allWeapons.forEach(weapon => {
            if (weapon.caliber && weapon.caliber !== "") {
                allCalibers.add(weapon.caliber);
            }
        });

        Array.from(allCalibers).sort().forEach(caliber => {
            const option = document.createElement('option');
            option.value = caliber;
            option.textContent = caliber;
            caliberSelect.appendChild(option);
        });
        return;
    }

    // Filter calibers by sub and main cat
    const filteredCalibers = new Set();

    allWeapons.forEach(weapon => {
        const matchesMainCat = weapon.mainCategory.toLowerCase() === mainCategory.toLowerCase();
        const matchesSubCat = subCategory === 'all' ||
            weapon.subCategory.toLowerCase() === subCategory.toLowerCase();

        if (matchesMainCat && matchesSubCat && weapon.caliber && weapon.caliber !== "") {
            filteredCalibers.add(weapon.caliber);
        }
    });

    // Add filters
    Array.from(filteredCalibers).sort().forEach(caliber => {
        const option = document.createElement('option');
        option.value = caliber;
        option.textContent = caliber;
        caliberSelect.appendChild(option);
    });

    // No calibers no dropdown
    caliberSelect.disabled = filteredCalibers.size === 0;
}

// Modal works
function openWeaponModal(weaponId) {
    const weapon = allWeapons[weaponId];
    if (!weapon) {
        console.error('Weapon not found:', weaponId);
        return;
    }

    let modal = document.getElementById('weaponModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'weaponModal';
        modal.className = 'weapon-modal-overlay';
        document.body.appendChild(modal);
    }

    const cleanWeaponName = cleanWeaponNameFunc(weapon.name);

    // Sort players by kills
    const sortedPlayers = [...(weapon.allPlayers || [])].sort((a, b) => (b.kills || 0) - (a.kills || 0));

    let playerDisplayName = null;

    const playersHTML = sortedPlayers.slice(0, 10).map((player, index) => {
        const hsPercent = player.kills > 0 ? ((player.headshots / player.kills) * 100).toFixed(1) : 0;
        const medal = `${index + 1}.`;

        let playerDisplayName = player.name || 'Unknown';

        if (typeof renderUsernameHTML === 'function') {
            if (player.playerObject) {
                playerDisplayName = renderUsernameHTML(player.playerObject);
            }

            else if (player.id && typeof findPlayerByPermaLink === 'function') {
                const fullPlayer = findPlayerByPermaLink(player.id);
                if (fullPlayer) {
                    playerDisplayName = renderUsernameHTML(fullPlayer);
                }
            }
        }

        return `
            <div class="modal-player-item">
                <span class="modal-player-rank">${medal}</span>
                <span class="modal-player-name">${playerDisplayName}</span>
                <span class="modal-player-level">Lvl ${player.level || 0}</span>
                <span class="modal-player-stats">
                    ${player.kills || 0} kills | ${hsPercent}% HS
                </span>
            </div>
        `;
    }).join('');

    // Attachments data from weapon
    const attachmentsHTML = weapon.groupedAttachments ?
        Object.entries(weapon.groupedAttachments).map(([category, items]) => {
            if (!items || items.length === 0) return '';

            const categoryNames = {
                scope: 'Scopes & Optics',
                magazine: 'Magazines',
                barrel: 'Barrel & Muzzle',
                stock: 'Stocks',
                grip: 'Grips',
                ammo: 'Ammunition',
                tactical: 'Tactical',
                other: 'Other'
            };

            const categoryName = categoryNames[category] || category;

            return `
            <div class="modal-attachment-category" data-category="${category}">
                <div class="modal-category-title">${categoryName} <span class="modal-category-count">(${items.length})</span></div>
                ${items.map((item, index) => {
                const itemId = item.template_id || item.id;
                const iconUrl = itemId ? `https://assets.tarkov.dev/${itemId}-512.webp` : null;
                const shortName = cleanWeaponNameFunc(item.showrtName) || cleanWeaponNameFunc(item.name) || 'Unknown';
                const fullName = cleanWeaponNameFunc(item.name) || '';

                return `
                        <div class="modal-attachment-item" style="--item-index: ${index};" title="${fullName}">
                            <div class="modal-attachment-icon-wrapper">
                                ${iconUrl ? `
                                    <img src="${iconUrl}" 
                                         alt="${shortName}" 
                                         class="modal-attachment-icon"
                                         onerror="this.style.display='none';"
                                         loading="lazy">
                                ` : `
                                <div class="modal-attachment-fallback">
                                    <span>${shortName.charAt(4).toUpperCase()}</span>
                                </div>`}

                            </div>
                            <div class="modal-attachment-info">
                                <span class="modal-attachment-name">${shortName}</span>
                                ${fullName && fullName !== shortName ? `<span class="modal-attachment-fullname">${fullName}</span>` : ''}
                            </div>
                            <div class="modal-attachment-stats">
                                <span class="modal-attachment-rate">${(item.pickRate || 0).toFixed(1)}%</span>
                                <div class="modal-attachment-bar">
                                    <div class="modal-attachment-fill" style="width: ${Math.min(item.pickRate || 0, 100)}%;"></div>
                                </div>
                                <span class="modal-attachment-count">${item.count || 0}x</span>
                            </div>
                        </div>
                    `;
            }).join('')}
            </div>
        `;
        }).join('') :
        '<div class="modal-empty">No attachments data available</div>';

    // Loadouts preview
    const loadoutsHTML = (weapon.loadouts || []).slice(0, 5).map((loadout, idx) => {
        const attachments = loadout.attachments || [];
        return `
            <div class="modal-loadout-item">
                <div class="modal-loadout-header">
                    <span class="modal-loadout-number">Loadout #${idx + 1}</span>
                    <span class="modal-loadout-time">${loadout.timestamp ? new Date(loadout.timestamp * 1000).toLocaleDateString() : 'Unknown date'}</span>
                </div>
                <div class="modal-loadout-attachments">
                    ${attachments.slice(0, 15).map(att => `
                        <span class="modal-loadout-tag">${att.name || 'Unknown'}</span>
                    `).join('')}
                    ${attachments.length > 15 ? `<span class="modal-loadout-tag">+${attachments.length - 15} more</span>` : ''}
                </div>
            </div>
        `;
    }).join('');

    modal.innerHTML = `
        <div class="modal-content">
            <button class="weapon-modal-close" onclick="closeWeaponModal()">×</button>
            
            <div class="weapon-modal-header">
                <img src="../media/weapon_icons/${cleanWeaponName}.webp" alt="${cleanWeaponName}" class="modal-weapon-icon" onerror="this.src='../media/default_weapon_icon.png';" />
                <div class="modal-weapon-info">
                    <span class="modal-weapon-caliber">${weapon.caliber || 'Unknown'}</span>
                    <h2 class="modal-weapon-name">${cleanWeaponName}</h2>
                    <div class="modal-weapon-stats">
                        <span>${weapon.loadoutCount || 0} loadouts</span>
                        <span>${weapon.attachments?.length || 0} unique attachments</span>
                        <span>${weapon.loadoutCount > 0 ? ((weapon.attachments?.length || 0) / weapon.loadoutCount).toFixed(1) : '0'} avg mods</span>
                    </div>
                </div>
            </div>

            <div class="weapon-modal-tabs">
                <button class="weapon-modal-tab active" data-tab="attachments">Attachments Pick Rate</button>
                <button class="weapon-modal-tab" data-tab="players">Top Players</button>
                <button class="weapon-modal-tab" data-tab="loadouts">Loadouts</button>
            </div>

            <div class="modal-tab-content active" id="tab-attachments">
                <div class="modal-attachments-container">
                    ${attachmentsHTML || '<div class="modal-empty">We have no recordings available :(</div>'}
                </div>
            </div>

            <div class="modal-tab-content" id="tab-players">
                <div class="modal-players-list">
                    ${playersHTML || '<div class="modal-empty">No player data available :(</div>'}
                </div>
            </div>

            <div class="modal-tab-content" id="tab-loadouts">
                <div class="modal-loadouts-container">
                    ${loadoutsHTML || '<div class="modal-empty">No loadout data available :(</div>'}
                    ${(weapon.loadouts?.length || 0) > 5 ? `<div class="modal-loadout-more">+ ${weapon.loadouts.length - 5} more loadouts</div>` : ''}
                </div>
            </div>
        </div>
    `;

    // Tab switching
    const tabs = modal.querySelectorAll('.weapon-modal-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            modal.querySelectorAll('.modal-tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            const content = modal.querySelector(`#tab-${tabId}`);
            if (content) content.classList.add('active');
        });
    });

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeWeaponModal() {
    const modal = document.getElementById('weaponModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('weaponModal');
    if (modal && e.target === modal) {
        closeWeaponModal();
    }
});

// Close modal on ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeWeaponModal();
    }
});

document.addEventListener('click', (e) => {
    const showMoreBtn = e.target.closest('.modal-show-more');
    if (showMoreBtn) {
        const categoryContainer = showMoreBtn.closest('.modal-attachment-category');
        if (!categoryContainer) return;

        const hiddenItems = categoryContainer.querySelectorAll('.modal-attachment-item.hidden');

        hiddenItems.forEach((item, index) => {
            setTimeout(() => {
                item.classList.remove('hidden');
                item.style.animation = 'attachmentSlideIn 0.3s ease forwards';
                item.style.animationDelay = `${index * 0.05}s`;
            }, index * 50);
        });

        showMoreBtn.style.display = 'none';
    }
});

// Helpers
async function processWeaponDataWithAttachments(equipmentData) {
    const weaponMap = new Map();

    allWeapons.forEach(weapon => {
        weaponMap.set(weapon.originalId || weapon.templateId, {
            ...weapon,
            attachments: [],
            loadouts: [],
            groupedAttachments: {},
            topAttachments: []
        });
    });

    // Process each equipment history entry
    for (const profileId in equipmentData) {
        const entries = equipmentData[profileId];
        if (!entries || !Array.isArray(entries)) continue;

        for (const entry of entries) {
            const equipment = entry.equipment;
            if (!equipment) continue;

            // Process First Primary Weapon
            if (equipment.FirstPrimaryWeapon && equipment.FirstPrimaryWeapon.length > 0) {
                const weaponAttachments = equipment.FirstPrimaryWeapon;
                const weaponType = weaponAttachments[0];

                if (!weaponType || !weaponType.template_id) continue;

                const weaponTemplateId = weaponType.template_id;

                let weaponEntry = weaponMap.get(weaponTemplateId);

                if (!weaponEntry) {
                    for (const [key, value] of weaponMap) {
                        if (value.originalId === weaponTemplateId) {
                            weaponEntry = value;
                            break;
                        }
                    }
                }

                if (weaponEntry) {
                    // Store attachments (skip the weapon itself)
                    const attachments = weaponAttachments.slice(1);
                    if (!weaponEntry.attachments) weaponEntry.attachments = [];
                    weaponEntry.attachments.push(...attachments);

                    // Store loadout with unique attachment IDs
                    if (!weaponEntry.loadouts) weaponEntry.loadouts = [];
                    const loadoutAttachments = attachments.map(att => ({
                        ...att,
                        uniqueId: att.template_id || att.id
                    }));

                    weaponEntry.loadouts.push({
                        attachments: loadoutAttachments,
                        timestamp: entry.timestamp,
                        profileId: profileId,
                        uniqueAttachmentIds: new Set(loadoutAttachments.map(a => a.uniqueId))
                    });

                    // Increment loadout count
                    weaponEntry.loadoutCount = (weaponEntry.loadoutCount || 0) + 1;
                }
            }
        }
    }

    allWeapons = Array.from(weaponMap.values()).map(weapon => {
        // Calculate top attachments
        const attachmentCounts = {};
        const attachmentDetails = {};

        if (weapon.attachments && weapon.attachments.length > 0) {
            weapon.attachments.forEach(att => {
                const id = att.template_id || att.id;
                if (!attachmentCounts[id]) {
                    attachmentCounts[id] = 0;
                    attachmentDetails[id] = {
                        name: att.name || att.shortName || 'Unknown',
                        shortName: att.shortName || '',
                        template_id: id,
                        amount: att.amount || 1
                    };
                }
                attachmentCounts[id] += (att.amount || 1);
            });
        }

        // Sort attachments by count
        const loadoutCount = weapon.loadoutCount || 1;
        const sortedAttachments = Object.entries(attachmentCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([id, count]) => ({
                ...attachmentDetails[id],
                count: count,
                pickRate: loadoutCount > 0 ? (count / loadoutCount) * 100 : 0
            }));

        // Group attachments by type
        const groupedAttachments = groupAttachmentsByType(sortedAttachments);

        return {
            ...weapon,
            attachments: sortedAttachments,
            groupedAttachments: groupedAttachments,
            topAttachments: sortedAttachments.slice(0, 5),
            loadoutCount: loadoutCount
        };
    });

    renderWeaponCards(allWeapons);

    return true;
}

function renderWeaponCards(weapons) {
    const container = document.getElementById('weaponsContainer');
    if (!container) return;

    container.innerHTML = '';

    // Calculate max values for tags
    const maxPlayerCount = Math.max(...weapons.map(w => w.playerCount || 0));
    const maxKills = Math.max(...weapons.map(w => w.kills || 0));

    weapons.forEach((weapon, index) => {
        const card = document.createElement('div');
        card.classList.add('weapon-card');
        card.dataset.weaponId = index;

        const cleanWeaponName = cleanWeaponNameFunc(weapon.name);

        // Generate tags
        const tags = [];
        const killPercentile = (weapon.kills || 0) / (maxKills || 1);
        const playerPercentile = (weapon.playerCount || 0) / (maxPlayerCount || 1);

        if (weapon.avgLevel < 20) tags.push({ text: 'Early Game', type: 'level', rarity: 'common' });
        if (weapon.avgLevel >= 20 && weapon.avgLevel < 35) tags.push({ text: 'Mid-Wipe', type: 'level', rarity: 'common' });
        if (weapon.avgLevel >= 35 && weapon.avgLevel < 50) tags.push({ text: 'Endgame', type: 'level', rarity: 'epic' });
        if (weapon.avgLevel >= 50) tags.push({ text: 'Veteran', type: 'level', rarity: 'legendary' });

        if (playerPercentile > 0.9) tags.push({ text: 'Community Favorite', type: 'popularity', rarity: 'legendary' });
        if (playerPercentile > 0.7 && playerPercentile <= 0.9) tags.push({ text: 'Popular Choice', type: 'popularity', rarity: 'epic' });

        if ((weapon.playerCount || 0) > 50 && weapon.avgLevel < 15) {
            tags.push({ text: 'Noob Stomper', type: 'kills', rarity: 'rare' });
        }

        if ((weapon.loadoutCount || 0) > 10 && (weapon.attachments?.length || 0) > 10) {
            tags.push({ text: 'Highly Modded', type: 'efficiency', rarity: 'epic' });
        }

        const tagRarityStyles = {
            common: '',
            rare: 'weapon-tag--rare',
            epic: 'weapon-tag--epic',
            legendary: 'weapon-tag--legendary'
        };

        const weaponTagsHTML = tags.map(tag => {
            const rarityClass = tagRarityStyles[tag.rarity] || '';
            return `<span class="weapon-tag weapon-tag--${tag.type} ${rarityClass}">${tag.text}</span>`;
        }).join('');

        // Map tags
        const mapTagsHTML = (weapon.topMaps || []).map(mapName => {
            const mapType = getMapType(mapName);
            return `<span class="map-tag map-tag--${mapType}">${formatMapName(mapName)}</span>`;
        }).join('');

        // Top players preview
        const topPlayersPreview = (weapon.topPlayers || []).slice(0, 3).map(player => {
            const hsPercent = player.kills > 0 ? ((player.headshots / player.kills) * 100).toFixed(1) : 0;
            return `
                <div class="player-preview-item">
                    <span class="player-preview-name">${player.name || 'Unknown'}</span>
                    <span class="player-preview-stats">${player.kills || 0}K | ${hsPercent || 0}% HS</span>
                </div>
            `;
        }).join('');

        // Attachment count display
        const attachmentCount = weapon.attachments?.length || 0;
        const loadoutCount = weapon.loadoutCount || 0;
        const avgMods = loadoutCount > 0 ? (attachmentCount / loadoutCount).toFixed(1) : '0';

        card.innerHTML = `
            <div class="weapon-header">
                <div class="weapon-name-wrapper">
                    <span class="weapon-caliber">${weapon.caliber || 'Unknown'}</span>
                    <img src="../media/weapon_icons/${cleanWeaponName}.webp" alt="${cleanWeaponName}" class="weapon-icon" onerror="this.src='../media/default_weapon_icon.png';" />
                    <div class="weapon-name-container">
                        <span class="weapon-name">${cleanWeaponName}</span>
                        <div class="weapon-tags">${weaponTagsHTML}</div>
                    </div>
                </div>
                <span class="weapon-rank">#${index + 1}</span>
            </div>

            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-label">Kills</div>
                    <div class="stat-value">${(weapon.kills || 0).toLocaleString('en-US')} <span class="stat-extra">(${weapon.killsPercent || 0}%)</span></div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Headshot Rate</div>
                    <div class="stat-value">${weapon.headshotsPercent || 0}%</div>
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${Math.min(weapon.headshotsPercent || 0, 100)}%;"></div>
                    </div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">AVG Shots to kill</div>
                    <div class="stat-value">${weapon.avgShots}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Used by (Lvl avg)</div>
                    <div class="stat-value">${weapon.playerCount.toLocaleString('en-US')} <span class="stat-extra">(${weapon.avgLevel})</span></div>
                </div>
            </div>

            <div class="map-tags-container">
                <div class="map-tags">${mapTagsHTML || '<span class="map-tag" style="color: var(--text-tertiary);">No map data</span>'}</div>
            </div>

            <div class="card-footer">
                <div class="player-preview">
                    ${topPlayersPreview || '<div class="player-preview-item" style="color: var(--text-tertiary);">No player data</div>'}
                </div>
                <button class="analytics-btn" data-weapon-id="${index}">
                    <span class="btn-text">See More Analytics</span>
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                </button>
            </div>
        `;

        // Add weapon categories to a card
        card.dataset.mainCategory = weapon.mainCategory || 'Unknown';
        card.dataset.subCategory = weapon.subCategory || 'Unknown';
        card.dataset.caliber = weapon.caliber || 'Unknown';

        container.appendChild(card);

        // click listener for analytics
        const analyticsBtn = card.querySelector('.analytics-btn');
        if (analyticsBtn) {
            analyticsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const weaponId = parseInt(e.currentTarget.dataset.weaponId);
                openWeaponModal(weaponId);
            });
        }
    });
}

/**
 * Groups weapon attachments into categories based on name keywords.
 * @param {Array<Object>} attachments - Array of attachment items with `name` properties
 * @returns {{scope: Array, magazine: Array, barrel: Array, stock: Array, grip: Array, ammo: Array, tactical: Array, other: Array}} Grouped attachments
 */
function groupAttachmentsByType(attachments) {
    const groups = {
        scope: [],
        magazine: [],
        barrel: [],
        stock: [],
        grip: [],
        ammo: [],
        tactical: [],
        other: []
    };

    attachments.forEach(item => {
        const name = (item.name || '').toLowerCase();
        const shortName = (item.shortName || '').toLowerCase();
        const fullName = name + ' ' + shortName;

        if (fullName.includes('riflescope') ||
            fullName.includes('scope') ||
            fullName.includes('optic') ||
            fullName.includes('holographic') ||
            fullName.includes('reflex sight') ||
            fullName.includes('vudu') ||
            fullName.includes('trijicon') ||
            fullName.includes('leupold') ||
            fullName.includes('eotech') ||
            fullName.includes('aimpoint')) {
            groups.scope.push(item);
        }
        else if (fullName.includes('magazine')) {
            groups.magazine.push(item);
        }
        else if (fullName.includes('tactical') ||
            fullName.includes('flashlight') ||
            fullName.includes('laser') ||
            fullName.includes('klesch') ||
            fullName.includes('x400') ||
            fullName.includes('light')) {
            groups.tactical.push(item);
        }
        else if (fullName.includes('barrel') ||
            fullName.includes('receiver') ||
            fullName.includes('bolt release') ||
            fullName.includes('flash hider') ||
            fullName.includes('silencer') ||
            fullName.includes('suppressor') ||
            fullName.includes('muzzle') ||
            fullName.includes('brake') ||
            fullName.includes('compensator') ||
            fullName.includes('handguard') ||
            fullName.includes('warcomp')) {
            groups.barrel.push(item);
        }
        else if (fullName.includes('stock') ||
            fullName.includes('buttstock') ||
            fullName.includes('recoil pad')) {
            groups.stock.push(item);
        }
        else if (fullName.includes('pistol grip') ||
            fullName.includes('foregrip')) {
            groups.grip.push(item);
        }
        else if (fullName.includes('mm') ||
            fullName.includes('x') ||
            fullName.includes('ammo') ||
            fullName.includes('cartridge') ||
            fullName.includes('round') ||
            fullName.includes('m855') ||
            fullName.includes('m995') ||
            fullName.includes('m80') ||
            fullName.includes('m62') ||
            fullName.includes('lapua') ||
            fullName.includes('magnum')) {
            groups.ammo.push(item);
        } else {
            groups.other.push(item);
        }
    });

    // Sort each group by pick rate (count / total)
    for (const key in groups) {
        groups[key].sort((a, b) => (b.count || 0) - (a.count || 0));
    }

    return groups;
}

function getMapType(mapName) {
    if (!mapName) return 'factory';
    const mapTypes = {
        'factory4_day': 'factory',
        'factory4_night': 'factory',
        'woods': 'woods',
        'bigmap': 'customs',
        'rezervbase': 'reserve',
        'shoreline': 'shoreline',
        'lighthouse': 'lighthouse',
        'sandbox': 'reserve',
        'sandbox_high': 'woods',
        'interchange': 'factory',
        'tarkovstreets': 'lighthouse',
        'laboratory': 'lighthouse'
    };
    return mapTypes[mapName.toLowerCase()] || 'factory';
}

function formatMapName(mapName) {
    if (!mapName) return 'Unknown';
    const mapNames = {
        'factory4_day': 'Factory Dominator',
        'factory4_night': 'Cultist Hunter',
        'woods': 'Woods Stalker',
        'bigmap': 'Export Specialist',
        'rezervbase': 'Military Prototype',
        'shoreline': 'Shoreline Monster',
        'lighthouse': 'Light Keeper',
        'sandbox': 'Ground Zero Dominator',
        'sandbox_high': 'Ground Zero Hero',
        'interchange': 'Inter-raptor',
        'tarkovstreets': 'Streets Ruler',
        'laboratory': 'Labs Demon'
    };
    return mapNames[mapName.toLowerCase()] || mapName;
}