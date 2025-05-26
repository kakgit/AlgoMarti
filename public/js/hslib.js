function buf2Long(a) {
    let b = new Uint8Array(a),
        val = 0,
        len = b.length;
    for (let i = 0, j = len - 1; i < len; i++, j--) {
        val += b[j] << (i * 8)
    }
    return val
}

function buf2Float(a, c) {
    let dataView = new DataView(a, c, 4);
    return dataView.getFloat32()
}

function buf2String(a) {
    return String.fromCharCode.apply(null, new Uint8Array(a))
}

function getFormatDate(a) {
    let date = new Date(a * 1000);
    let formatDate = leadingZero(date.getDate()) + "/" + leadingZero((date.getMonth()) + 1) + "/" + date.getFullYear() + " " + leadingZero(date.getHours()) + ":" + leadingZero(date.getMinutes()) + ":" + leadingZero(date.getSeconds());
    return formatDate
}

function getFormatDate2(c) {
    var a = new Date(1970, 0, 1);
    a.setSeconds(c);
    let formatDate = leadingZero(a.getDate()) + "/" + leadingZero((a.getMonth()) + 1) + "/" + a.getFullYear() + " " + leadingZero(a.getHours()) + ":" + leadingZero(a.getMinutes()) + ":" + leadingZero(a.getSeconds());
    return formatDate
}

function encodeData(a) {
    let compressed = _atos(pako.deflate(a));
    return window.btoa(compressed)
}

function decodeData(a) {
    console.log(a);
    let decoded = window.atob(a);
    return _atos(pako.inflate(decoded))
}

function _atos(a) {
    let newarray = [];
    for (let i = 0; i < a.length; i++) {
        newarray.push(String.fromCharCode(a[i]))
    }
    return newarray.join("")
}

function leadingZero(a) {
    return a < 10 ? ("0" + a.toString()) : a.toString()
}

function isScripOK(a) {
    let scripsCount = a.split("&").length;
    if (scripsCount > MAX_SCRIPS) {
        console.error("Maximum scrips allowed per request is " + MAX_SCRIPS);
        return false
    }
    return true
}

function checkDateFormat(a) {
    return new RegExp("^(0{1}[1-9]|[12][0-9]|3[01])/(0{1}[1-9]|1[012])/20\\d{2}$").test(a)
}

function sendJsonArrResp(a) {
    let jsonArrRes = [];
    jsonArrRes.push(a);
    return JSON.stringify(jsonArrRes)
}

function HSDebug(a) {
    if (HSD_Flag) {
        //console.log(a)
    }
}

function HSIDebug(a) {
    if (HSID_Flag) {
        //console.log(a)
    }
}

function enableHsiLog(a) {
    HSID_Flag = a
}

function enableLog(a) {
    HSD_Flag = a
}
var DataType = (function() {
    function a(c, d) {
        this.name = c;
        this.type = d
    }
    return a
}());
const LIB_VERSION = "3.0.0";
const isSingleLib = true;
var isEncyptIn = true;
var isEncyptOut = false;
var HSD_Flag = true;
var HSID_Flag = true;
const MAX_SCRIPS = 100;
const TRASH_VAL = -2147483648;
var ackNum = 0;
const FieldTypes = {
    FLOAT32: 1,
    LONG: 2,
    DATE: 3,
    STRING: 4
};
const ResponseTypes = {
    SNAP: 83,
    UPDATE: 85
};
const TopicTypes = {
    SCRIP: "sf",
    INDEX: "if",
    DEPTH: "dp"
};
const BinRespStat = {
    OK: "K",
    NOT_OK: "N"
};
const STAT = {
    OK: "Ok",
    NOT_OK: "NotOk"
};
const Keys = {
    TYPE: "type",
    USER_ID: "user",
    SESSION_ID: "sessionid",
    SCRIPS: "scrips",
    CHANNEL_NUM: "channelnum",
    CHANNEL_NUMS: "channelnums",
    JWT: "jwt",
    REDIS_KEY: "redis",
    STK_PRC: "stkprc",
    HIGH_STK: "highstk",
    LOW_STK: "lowstk",
    OPC_KEY: "key",
    AUTORIZATION: "Authorization",
    SID: "Sid",
    X_ACCESS_TOKEN: "x-access-token",
    SOURCE: "source"
};
const ReqTypeValues = {
    CONNECTION: "cn",
    SCRIP_SUBS: "mws",
    SCRIP_UNSUBS: "mwu",
    INDEX_SUBS: "ifs",
    INDEX_UNSUBS: "ifu",
    DEPTH_SUBS: "dps",
    DEPTH_UNSUBS: "dpu",
    CHANNEL_RESUME: "cr",
    CHANNEL_PAUSE: "cp",
    SNAP_MW: "mwsp",
    SNAP_DP: "dpsp",
    SNAP_IF: "ifsp",
    OPC_SUBS: "opc",
    THROTTLING_INTERVAL: "ti",
    STR: "str",
    FORCE_CONNECTION: "fcn",
    LOG: "log"
};
const RespTypeValues = {
    CONN: "cn",
    SUBS: "sub",
    UNSUBS: "unsub",
    SNAP: "snap",
    CHANNELR: "cr",
    CHANNELP: "cp",
    OPC: "opc"
};
const BinRespTypes = {
    CONNECTION_TYPE: 1,
    THROTTLING_TYPE: 2,
    ACK_TYPE: 3,
    SUBSCRIBE_TYPE: 4,
    UNSUBSCRIBE_TYPE: 5,
    DATA_TYPE: 6,
    CHPAUSE_TYPE: 7,
    CHRESUME_TYPE: 8,
    SNAPSHOT: 9,
    OPC_SUBSCRIBE: 10
};
const RespCodes = {
    SUCCESS: 200,
    CONNECTION_FAILED: 11001,
    CONNECTION_INVALID: 11002,
    SUBSCRIPTION_FAILED: 11011,
    UNSUBSCRIPTION_FAILED: 11012,
    SNAPSHOT_FAILED: 11013,
    CHANNELP_FAILED: 11031,
    CHANNELR_FAILED: 11032
};
const DEPTH_PREFIX = "dp";
const SCRIP_PREFIX = "sf";
const INDEX_PREFIX = "if";
const STRING_INDEX = {
    NAME: 51,
    SYMBOL: 52,
    EXCHG: 53,
    TSYMBOL: 54
};
const SCRIP_INDEX = {
    VOLUME: 4,
    LTP: 5,
    CLOSE: 21,
    VWAP: 13,
    MULTIPLIER: 23,
    PRECISION: 24,
    CHANGE: 25,
    PERCHANGE: 26,
    TURNOVER: 27
};
const SCRIP_MAPPING = [];
SCRIP_MAPPING[0] = new DataType("ftm0", FieldTypes.DATE);
SCRIP_MAPPING[1] = new DataType("dtm1", FieldTypes.DATE);
SCRIP_MAPPING[2] = new DataType("fdtm", FieldTypes.DATE);
SCRIP_MAPPING[3] = new DataType("ltt", FieldTypes.DATE);
SCRIP_MAPPING[SCRIP_INDEX.VOLUME] = new DataType("v", FieldTypes.LONG);
SCRIP_MAPPING[SCRIP_INDEX.LTP] = new DataType("ltp", FieldTypes.FLOAT32);
SCRIP_MAPPING[6] = new DataType("ltq", FieldTypes.LONG);
SCRIP_MAPPING[7] = new DataType("tbq", FieldTypes.LONG);
SCRIP_MAPPING[8] = new DataType("tsq", FieldTypes.LONG);
SCRIP_MAPPING[9] = new DataType("bp", FieldTypes.FLOAT32);
SCRIP_MAPPING[10] = new DataType("sp", FieldTypes.FLOAT32);
SCRIP_MAPPING[11] = new DataType("bq", FieldTypes.LONG);
SCRIP_MAPPING[12] = new DataType("bs", FieldTypes.LONG);
SCRIP_MAPPING[SCRIP_INDEX.VWAP] = new DataType("ap", FieldTypes.FLOAT32);
SCRIP_MAPPING[14] = new DataType("lo", FieldTypes.FLOAT32);
SCRIP_MAPPING[15] = new DataType("h", FieldTypes.FLOAT32);
SCRIP_MAPPING[16] = new DataType("lcl", FieldTypes.FLOAT32);
SCRIP_MAPPING[17] = new DataType("ucl", FieldTypes.FLOAT32);
SCRIP_MAPPING[18] = new DataType("yh", FieldTypes.FLOAT32);
SCRIP_MAPPING[19] = new DataType("yl", FieldTypes.FLOAT32);
SCRIP_MAPPING[20] = new DataType("op", FieldTypes.FLOAT32);
SCRIP_MAPPING[SCRIP_INDEX.CLOSE] = new DataType("c", FieldTypes.FLOAT32);
SCRIP_MAPPING[22] = new DataType("oi", FieldTypes.LONG);
SCRIP_MAPPING[SCRIP_INDEX.MULTIPLIER] = new DataType("mul", FieldTypes.LONG);
SCRIP_MAPPING[SCRIP_INDEX.PRECISION] = new DataType("prec", FieldTypes.LONG);
SCRIP_MAPPING[SCRIP_INDEX.CHANGE] = new DataType("cng", FieldTypes.FLOAT32);
SCRIP_MAPPING[SCRIP_INDEX.PERCHANGE] = new DataType("nc", FieldTypes.STRING);
SCRIP_MAPPING[SCRIP_INDEX.TURNOVER] = new DataType("to", FieldTypes.FLOAT32);
SCRIP_MAPPING[STRING_INDEX.NAME] = new DataType("name", FieldTypes.STRING);
SCRIP_MAPPING[STRING_INDEX.SYMBOL] = new DataType("tk", FieldTypes.STRING);
SCRIP_MAPPING[STRING_INDEX.EXCHG] = new DataType("e", FieldTypes.STRING);
SCRIP_MAPPING[STRING_INDEX.TSYMBOL] = new DataType("ts", FieldTypes.STRING);
const INDEX_INDEX = {
    LTP: 2,
    CLOSE: 3,
    CHANGE: 10,
    PERCHANGE: 11,
    MULTIPLIER: 8,
    PRECISION: 9
};
const INDEX_MAPPING = [];
INDEX_MAPPING[0] = new DataType("ftm0", FieldTypes.DATE);
INDEX_MAPPING[1] = new DataType("dtm1", FieldTypes.DATE);
INDEX_MAPPING[INDEX_INDEX.LTP] = new DataType("iv", FieldTypes.FLOAT32);
INDEX_MAPPING[INDEX_INDEX.CLOSE] = new DataType("ic", FieldTypes.FLOAT32);
INDEX_MAPPING[4] = new DataType("tvalue", FieldTypes.DATE);
INDEX_MAPPING[5] = new DataType("highPrice", FieldTypes.FLOAT32);
INDEX_MAPPING[6] = new DataType("lowPrice", FieldTypes.FLOAT32);
INDEX_MAPPING[7] = new DataType("openingPrice", FieldTypes.FLOAT32);
INDEX_MAPPING[INDEX_INDEX.MULTIPLIER] = new DataType("mul", FieldTypes.LONG);
INDEX_MAPPING[INDEX_INDEX.PRECISION] = new DataType("prec", FieldTypes.LONG);
INDEX_MAPPING[INDEX_INDEX.CHANGE] = new DataType("cng", FieldTypes.FLOAT32);
INDEX_MAPPING[INDEX_INDEX.PERCHANGE] = new DataType("nc", FieldTypes.STRING);
INDEX_MAPPING[STRING_INDEX.NAME] = new DataType("name", FieldTypes.STRING);
INDEX_MAPPING[STRING_INDEX.SYMBOL] = new DataType("tk", FieldTypes.STRING);
INDEX_MAPPING[STRING_INDEX.EXCHG] = new DataType("e", FieldTypes.STRING);
INDEX_MAPPING[STRING_INDEX.TSYMBOL] = new DataType("ts", FieldTypes.STRING);
const DEPTH_INDEX = {
    MULTIPLIER: 32,
    PRECISION: 33
};
const DEPTH_MAPPING = [];
DEPTH_MAPPING[0] = new DataType("ftm0", FieldTypes.DATE);
DEPTH_MAPPING[1] = new DataType("dtm1", FieldTypes.DATE);
DEPTH_MAPPING[2] = new DataType("bp", FieldTypes.FLOAT32);
DEPTH_MAPPING[3] = new DataType("bp1", FieldTypes.FLOAT32);
DEPTH_MAPPING[4] = new DataType("bp2", FieldTypes.FLOAT32);
DEPTH_MAPPING[5] = new DataType("bp3", FieldTypes.FLOAT32);
DEPTH_MAPPING[6] = new DataType("bp4", FieldTypes.FLOAT32);
DEPTH_MAPPING[7] = new DataType("sp", FieldTypes.FLOAT32);
DEPTH_MAPPING[8] = new DataType("sp1", FieldTypes.FLOAT32);
DEPTH_MAPPING[9] = new DataType("sp2", FieldTypes.FLOAT32);
DEPTH_MAPPING[10] = new DataType("sp3", FieldTypes.FLOAT32);
DEPTH_MAPPING[11] = new DataType("sp4", FieldTypes.FLOAT32);
DEPTH_MAPPING[12] = new DataType("bq", FieldTypes.LONG);
DEPTH_MAPPING[13] = new DataType("bq1", FieldTypes.LONG);
DEPTH_MAPPING[14] = new DataType("bq2", FieldTypes.LONG);
DEPTH_MAPPING[15] = new DataType("bq3", FieldTypes.LONG);
DEPTH_MAPPING[16] = new DataType("bq4", FieldTypes.LONG);
DEPTH_MAPPING[17] = new DataType("bs", FieldTypes.LONG);
DEPTH_MAPPING[18] = new DataType("bs1", FieldTypes.LONG);
DEPTH_MAPPING[19] = new DataType("bs2", FieldTypes.LONG);
DEPTH_MAPPING[20] = new DataType("bs3", FieldTypes.LONG);
DEPTH_MAPPING[21] = new DataType("bs4", FieldTypes.LONG);
DEPTH_MAPPING[22] = new DataType("bno1", FieldTypes.LONG);
DEPTH_MAPPING[23] = new DataType("bno2", FieldTypes.LONG);
DEPTH_MAPPING[24] = new DataType("bno3", FieldTypes.LONG);
DEPTH_MAPPING[25] = new DataType("bno4", FieldTypes.LONG);
DEPTH_MAPPING[26] = new DataType("bno5", FieldTypes.LONG);
DEPTH_MAPPING[27] = new DataType("sno1", FieldTypes.LONG);
DEPTH_MAPPING[28] = new DataType("sno2", FieldTypes.LONG);
DEPTH_MAPPING[29] = new DataType("sno3", FieldTypes.LONG);
DEPTH_MAPPING[30] = new DataType("sno4", FieldTypes.LONG);
DEPTH_MAPPING[31] = new DataType("sno5", FieldTypes.LONG);
DEPTH_MAPPING[DEPTH_INDEX.MULTIPLIER] = new DataType("mul", FieldTypes.LONG);
DEPTH_MAPPING[DEPTH_INDEX.PRECISION] = new DataType("prec", FieldTypes.LONG);
DEPTH_MAPPING[STRING_INDEX.NAME] = new DataType("name", FieldTypes.STRING);
DEPTH_MAPPING[STRING_INDEX.SYMBOL] = new DataType("tk", FieldTypes.STRING);
DEPTH_MAPPING[STRING_INDEX.EXCHG] = new DataType("e", FieldTypes.STRING);
DEPTH_MAPPING[STRING_INDEX.TSYMBOL] = new DataType("ts", FieldTypes.STRING);
var ByteData = (function() {
    function a(c) {
        this.pos = 0;
        this.bytes = new Uint8Array(c);
        this.startOfMsg = 0;
        this.markStartOfMsg = function() {
            this.startOfMsg = this.pos;
            this.pos += 2
        };
        this.markEndOfMsg = function() {
            let len = (this.pos - this.startOfMsg - 2);
            this.bytes[0] = ((len >> 8) & 255);
            this.bytes[1] = (len & 255)
        };
        this.clear = function() {
            this.pos = 0
        };
        this.getPosition = function() {
            return this.pos
        };
        this.getBytes = function() {
            return this.bytes
        };
        this.appendByte = function(d) {
            this.bytes[this.pos++] = d
        };
        this.appendByteAtPos = function(e, d) {
            this.bytes[e] = d
        };
        this.appendChar = function(d) {
            this.bytes[this.pos++] = d
        };
        this.appendCharAtPos = function(e, d) {
            this.bytes[e] = d
        };
        this.appendShort = function(d) {
            this.bytes[this.pos++] = ((d >> 8) & 255);
            this.bytes[this.pos++] = (d & 255)
        };
        this.appendInt = function(d) {
            this.bytes[this.pos++] = ((d >> 24) & 255);
            this.bytes[this.pos++] = ((d >> 16) & 255);
            this.bytes[this.pos++] = ((d >> 8) & 255);
            this.bytes[this.pos++] = (d & 255)
        };
        this.appendLong = function(d) {
            this.bytes[this.pos++] = ((d >> 56) & 255);
            this.bytes[this.pos++] = ((d >> 48) & 255);
            this.bytes[this.pos++] = ((d >> 40) & 255);
            this.bytes[this.pos++] = ((d >> 32) & 255);
            this.bytes[this.pos++] = ((d >> 24) & 255);
            this.bytes[this.pos++] = ((d >> 16) & 255);
            this.bytes[this.pos++] = ((d >> 8) & 255);
            this.bytes[this.pos++] = (d & 255)
        };
        this.appendLongAsBigInt = function(e) {
            const d = BigInt(e);
            this.bytes[this.pos++] = Number((d >> BigInt(56)) & BigInt(255));
            this.bytes[this.pos++] = Number((d >> BigInt(48)) & BigInt(255));
            this.bytes[this.pos++] = Number((d >> BigInt(40)) & BigInt(255));
            this.bytes[this.pos++] = Number((d >> BigInt(32)) & BigInt(255));
            this.bytes[this.pos++] = Number((d >> BigInt(24)) & BigInt(255));
            this.bytes[this.pos++] = Number((d >> BigInt(16)) & BigInt(255));
            this.bytes[this.pos++] = Number((d >> BigInt(8)) & BigInt(255));
            this.bytes[this.pos++] = Number(d & BigInt(255))
        };
        this.appendString = function(d) {
            let strLen = d.length;
            for (let i = 0; i < strLen; i++) {
                this.bytes[this.pos++] = d.charCodeAt(i)
            }
        };
        this.appendByteArr = function(d) {
            let byteLen = d.length;
            for (let i = 0; i < byteLen; i++) {
                this.bytes[this.pos++] = d[i]
            }
        };
        this.appendByteArr = function(e, d) {
            for (let i = 0; i < d; i++) {
                this.bytes[this.pos++] = e[i]
            }
        }
    }
    return a
}());

function getAcknowledgementReq(a) {
    let buffer = new ByteData(11);
    buffer.markStartOfMsg();
    buffer.appendByte(BinRespTypes.ACK_TYPE);
    buffer.appendByte(1);
    buffer.appendByte(1);
    buffer.appendShort(4);
    buffer.appendInt(a);
    buffer.markEndOfMsg();
    return buffer.getBytes()
}

function prepareConnectionRequest(a) {
    let userIdLen = a.length;
    let src = "JS_API";
    let srcLen = src.length;
    let buffer = new ByteData(userIdLen + srcLen + 10);
    buffer.markStartOfMsg();
    buffer.appendByte(BinRespTypes.CONNECTION_TYPE);
    buffer.appendByte(2);
    buffer.appendByte(1);
    buffer.appendShort(userIdLen);
    buffer.appendString(a);
    buffer.appendByte(2);
    buffer.appendShort(srcLen);
    buffer.appendString(src);
    buffer.markEndOfMsg();
    return buffer.getBytes()
}

function prepareConnectionRequest2(a, c) {
    let src = "JS_API";
    let srcLen = src.length;
    let jwtLen = a.length;
    let redisLen = c.length;
    let buffer = new ByteData(srcLen + jwtLen + redisLen + 13);
    buffer.markStartOfMsg();
    buffer.appendByte(BinRespTypes.CONNECTION_TYPE);
    buffer.appendByte(3);
    buffer.appendByte(1);
    buffer.appendShort(jwtLen);
    buffer.appendString(a);
    buffer.appendByte(2);
    buffer.appendShort(redisLen);
    buffer.appendString(c);
    buffer.appendByte(3);
    buffer.appendShort(srcLen);
    buffer.appendString(src);
    buffer.markEndOfMsg();
    return buffer.getBytes()
}

function prepareSubsUnSubsRequest(c, d, e, a) {
    if (!isScripOK(c)) {
        return
    }
    let dataArr = getScripByteArray(c, e);
    let buffer = new ByteData(dataArr.length + 11);
    buffer.markStartOfMsg();
    buffer.appendByte(d);
    buffer.appendByte(2);
    buffer.appendByte(1);
    buffer.appendShort(dataArr.length);
    buffer.appendByteArr(dataArr, dataArr.length);
    buffer.appendByte(2);
    buffer.appendShort(1);
    buffer.appendByte(a);
    buffer.markEndOfMsg();
    return buffer.getBytes()
}

function prepareChannelRequest(c, a) {
    let buffer = new ByteData(15);
    buffer.markStartOfMsg();
    buffer.appendByte(c);
    buffer.appendByte(1);
    buffer.appendByte(1);
    buffer.appendShort(8);
    let int1 = 0,
        int2 = 0;
    a.forEach(function(d) {
        if (d > 0 && d <= 32) {
            int1 |= 1 << d
        } else {
            if (d > 32 && d <= 64) {
                int2 |= 1 << d
            } else {
                console.error("Error: Channel values must be in this range  [ val > 0 && val < 65 ]")
            }
        }
    });
    buffer.appendInt(int2);
    buffer.appendInt(int1);
    buffer.markEndOfMsg();
    return buffer.getBytes()
}

function prepareSnapshotRequest(a, c, d) {
    if (!isScripOK(a)) {
        return
    }
    let dataArr = getScripByteArray(a, d);
    let buffer = new ByteData(dataArr.length + 7);
    buffer.markStartOfMsg();
    buffer.appendByte(c);
    buffer.appendByte(1);
    buffer.appendByte(1);
    buffer.appendShort(dataArr.length);
    buffer.appendByteArr(dataArr, dataArr.length);
    buffer.markEndOfMsg();
    return buffer.getBytes()
}

function prepareThrottlingIntervalRequest(a) {
    let buffer = new ByteData(11);
    buffer.markStartOfMsg();
    buffer.appendByte(BinRespTypes.THROTTLING_TYPE);
    buffer.appendByte(1);
    buffer.appendByte(1);
    buffer.appendShort(4);
    buffer.appendInt(a);
    buffer.markEndOfMsg();
    return buffer.getBytes()
}

function getScripByteArray(c, a) {
    if (c.charCodeAt[c.length - 1] == "&") {
        c = c.substring(0, c.length - 1)
    }
    let scripArray = c.split("&");
    let scripsCount = scripArray.length;
    let dataLen = 0;
    for (let index = 0; index < scripsCount; index++) {
        scripArray[index] = a + "|" + scripArray[index];
        dataLen += scripArray[index].length + 1
    }
    let bytes = new Uint8Array(dataLen + 2);
    let pos = 0;
    bytes[pos++] = ((scripsCount >> 8) & 255);
    bytes[pos++] = (scripsCount & 255);
    for (let index = 0; index < scripsCount; index++) {
        let currScrip = scripArray[index];
        let scripLen = currScrip.length;
        bytes[pos++] = (scripLen & 255);
        for (strIndex = 0; strIndex < scripLen; strIndex++) {
            bytes[pos++] = currScrip.charCodeAt(strIndex)
        }
    }
    return bytes
}

function getOpChainSubsRequest(d, e, a, c, f) {
    let opcKeyLen = d.length;
    let buffer = new ByteData(opcKeyLen + 30);
    buffer.markStartOfMsg();
    buffer.appendByte(BinRespTypes.OPC_SUBSCRIBE);
    buffer.appendByte(5);
    buffer.appendByte(1);
    buffer.appendShort(opcKeyLen);
    buffer.appendString(d);
    buffer.appendByte(2);
    buffer.appendShort(8);
    buffer.appendLongAsBigInt(e);
    buffer.appendByte(3);
    buffer.appendShort(1);
    buffer.appendByte(a);
    buffer.appendByte(4);
    buffer.appendShort(1);
    buffer.appendByte(c);
    buffer.appendByte(5);
    buffer.appendShort(1);
    buffer.appendByte(f);
    buffer.markEndOfMsg();
    return buffer.getBytes()
}
var topicList = {};
var counter = 0;
var HSWrapper = (function() {
    function a() {
        this.parseData = function(e) {
            let pos = 0;
            let packetsCount = buf2Long(e.slice(pos, 2));
            HSDebug("packets.length: " + packetsCount);
            pos += 2;
            let type = buf2Long(e.slice(pos, pos + 1));
            pos += 1;
            HSDebug("TYPE:: " + type);
            if (type == BinRespTypes.CONNECTION_TYPE) {
                let jsonRes = {};
                let fCount = buf2Long(e.slice(pos, pos + 1));
                pos += 1;
                if (fCount >= 2) {
                    let fid1 = buf2Long(e.slice(pos, pos + 1));
                    pos += 1;
                    let valLen = buf2Long(e.slice(pos, pos + 2));
                    pos += 2;
                    let status = buf2String(e.slice(pos, pos + valLen));
                    pos += valLen;
                    fid1 = buf2Long(e.slice(pos, pos + 1));
                    pos += 1;
                    valLen = buf2Long(e.slice(pos, pos + 2));
                    pos += 2;
                    let ackCount = buf2Long(e.slice(pos, pos + valLen));
                    switch (status) {
                        case BinRespStat.OK:
                            jsonRes.stat = STAT.OK;
                            jsonRes.type = RespTypeValues.CONN;
                            jsonRes.msg = "successful";
                            jsonRes.stCode = RespCodes.SUCCESS;
                            break;
                        case BinRespStat.NOT_OK:
                            jsonRes.stat = STAT.NOT_OK;
                            jsonRes.type = RespTypeValues.CONN;
                            jsonRes.msg = "failed";
                            jsonRes.stCode = RespCodes.CONNECTION_FAILED;
                            break
                    }
                    ackNum = ackCount
                } else {
                    if (fCount == 1) {
                        let fid1 = buf2Long(e.slice(pos, pos + 1));
                        pos += 1;
                        let valLen = buf2Long(e.slice(pos, pos + 2));
                        pos += 2;
                        let status = buf2String(e.slice(pos, pos + valLen));
                        pos += valLen;
                        switch (status) {
                            case BinRespStat.OK:
                                jsonRes.stat = STAT.OK;
                                jsonRes.type = RespTypeValues.CONN;
                                jsonRes.msg = "successful";
                                jsonRes.stCode = RespCodes.SUCCESS;
                                break;
                            case BinRespStat.NOT_OK:
                                jsonRes.stat = STAT.NOT_OK;
                                jsonRes.type = RespTypeValues.CONN;
                                jsonRes.msg = "failed";
                                jsonRes.stCode = RespCodes.CONNECTION_FAILED;
                                break
                        }
                    } else {
                        jsonRes.stat = STAT.NOT_OK;
                        jsonRes.type = RespTypeValues.CONN;
                        jsonRes.msg = "invalid field count";
                        jsonRes.stCode = RespCodes.CONNECTION_INVALID
                    }
                }
                return sendJsonArrResp(jsonRes)
            } else {
                if (type == BinRespTypes.DATA_TYPE) {
                    let msgNum = 0;
                    if (ackNum > 0) {
                        ++counter;
                        msgNum = buf2Long(e.slice(pos, pos + 4));
                        pos += 4;
                        if (counter == ackNum) {
                            let req = getAcknowledgementReq(msgNum);
                            if (ws) {
                                ws.send(req)
                            }
                            HSDebug("Acknowledgement sent for message num: " + msgNum);
                            counter = 0
                        }
                    }
                    var h = [];
                    var g = buf2Long(e.slice(pos, pos + 2));
                    pos += 2;
                    for (let n = 0; n < g; n++) {
                        pos += 2;
                        var c = buf2Long(e.slice(pos, pos + 1));
                        HSDebug("ResponseType: " + c);
                        pos++;
                        if (c == ResponseTypes.SNAP) {
                            let f = buf2Long(e.slice(pos, pos + 4));
                            pos += 4;
                            HSDebug("topic Id: " + f);
                            let nameLen = buf2Long(e.slice(pos, pos + 1));
                            pos++;
                            HSDebug("nameLen:" + nameLen);
                            let topicName = buf2String(e.slice(pos, pos + nameLen));
                            pos += nameLen;
                            HSDebug("topicName: " + topicName);
                            let d = this.getNewTopicData(topicName);
                            if (d) {
                                topicList[f] = d;
                                let fcount = buf2Long(e.slice(pos, pos + 1));
                                pos++;
                                HSDebug("fcount1: " + fcount);
                                for (let index = 0; index < fcount; index++) {
                                    let fvalue = buf2Long(e.slice(pos, pos + 4));
                                    d.setLongValues(index, fvalue);
                                    pos += 4;
                                    HSDebug(index + ":" + fvalue)
                                }
                                d.setMultiplierAndPrec();
                                fcount = buf2Long(e.slice(pos, pos + 1));
                                pos++;
                                HSDebug("fcount2: " + fcount);
                                for (let index = 0; index < fcount; index++) {
                                    let fid = buf2Long(e.slice(pos, pos + 1));
                                    pos++;
                                    let dataLen = buf2Long(e.slice(pos, pos + 1));
                                    pos++;
                                    let strVal = buf2String(e.slice(pos, pos + dataLen));
                                    pos += dataLen;
                                    d.setStringValues(fid, strVal);
                                    HSDebug(fid + ":" + strVal)
                                }
                                h.push(d.prepareData())
                            } else {
                                HSDebug("Invalid topic feed type !")
                            }
                        } else {
                            if (c == ResponseTypes.UPDATE) {
                                HSDebug("updates ......");
                                var f = buf2Long(e.slice(pos, pos + 4));
                                HSDebug("topic Id: " + f);
                                pos += 4;
                                var d = topicList[f];
                                if (!d) {
                                    console.error("Topic Not Available in TopicList!")
                                } else {
                                    let fcount = buf2Long(e.slice(pos, pos + 1));
                                    pos++;
                                    HSDebug("fcount1: " + fcount);
                                    for (let index = 0; index < fcount; index++) {
                                        let fvalue = buf2Long(e.slice(pos, pos + 4));
                                        d.setLongValues(index, fvalue);
                                        HSDebug("index:" + index + ", val:" + fvalue);
                                        pos += 4
                                    }
                                }
                                h.push(d.prepareData())
                            } else {
                                console.error("Invalid ResponseType: " + c)
                            }
                        }
                    }
                    return JSON.stringify(h)
                } else {
                    if (type == BinRespTypes.SUBSCRIBE_TYPE || type == BinRespTypes.UNSUBSCRIBE_TYPE) {
                        let status = this.getStatus(e, pos);
                        let jsonRes = {};
                        switch (status) {
                            case BinRespStat.OK:
                                jsonRes.stat = STAT.OK;
                                jsonRes.type = type == BinRespTypes.SUBSCRIBE_TYPE ? RespTypeValues.SUBS : RespTypeValues.UNSUBS;
                                jsonRes.msg = "successful";
                                jsonRes.stCode = RespCodes.SUCCESS;
                                break;
                            case BinRespStat.NOT_OK:
                                jsonRes.stat = STAT.NOT_OK;
                                if (type == BinRespTypes.SUBSCRIBE_TYPE) {
                                    jsonRes.type = RespTypeValues.SUBS;
                                    jsonRes.msg = "subscription failed";
                                    jsonRes.stCode = RespCodes.SUBSCRIPTION_FAILED
                                } else {
                                    jsonRes.type = RespTypeValues.UNSUBS;
                                    jsonRes.msg = "unsubscription  failed";
                                    jsonRes.stCode = RespCodes.UNSUBSCRIPTION_FAILED
                                }
                                break
                        }
                        return sendJsonArrResp(jsonRes)
                    } else {
                        if (type == BinRespTypes.SNAPSHOT) {
                            let status = this.getStatus(e, pos);
                            let jsonRes = {};
                            switch (status) {
                                case BinRespStat.OK:
                                    jsonRes.stat = STAT.OK;
                                    jsonRes.type = RespTypeValues.SNAP;
                                    jsonRes.msg = "successful";
                                    jsonRes.stCode = RespCodes.SUCCESS;
                                    break;
                                case BinRespStat.NOT_OK:
                                    jsonRes.stat = STAT.NOT_OK;
                                    jsonRes.type = RespTypeValues.SNAP;
                                    jsonRes.msg = "failed";
                                    jsonRes.stCode = RespCodes.SNAPSHOT_FAILED;
                                    break
                            }
                            return sendJsonArrResp(jsonRes)
                        } else {
                            if (type == BinRespTypes.CHPAUSE_TYPE || type == BinRespTypes.CHRESUME_TYPE) {
                                let status = this.getStatus(e, pos);
                                let jsonRes = {};
                                switch (status) {
                                    case BinRespStat.OK:
                                        jsonRes.stat = STAT.OK;
                                        jsonRes.type = type == BinRespTypes.CHPAUSE_TYPE ? RespTypeValues.CHANNELP : RespTypeValues.CHANNELR;
                                        jsonRes.msg = "successful";
                                        jsonRes.stCode = RespCodes.SUCCESS;
                                        break;
                                    case BinRespStat.NOT_OK:
                                        jsonRes.stat = STAT.NOT_OK;
                                        jsonRes.type = type == BinRespTypes.CHPAUSE_TYPE ? RespTypeValues.CHANNELP : RespTypeValues.CHANNELR;
                                        jsonRes.msg = "failed";
                                        jsonRes.stCode = type == BinRespTypes.CHPAUSE_TYPE ? RespCodes.CHANNELP_FAILED : RespCodes.CHANNELR_FAILED;
                                        break
                                }
                                return sendJsonArrResp(jsonRes)
                            } else {
                                if (type == BinRespTypes.OPC_SUBSCRIBE) {
                                    let status = this.getStatus(e, pos);
                                    pos += 5;
                                    let jsonRes = {};
                                    switch (status) {
                                        case BinRespStat.OK:
                                            jsonRes.stat = STAT.OK;
                                            jsonRes.type = RespTypeValues.OPC;
                                            jsonRes.msg = "successful";
                                            jsonRes.stCode = RespCodes.SUCCESS;
                                            let fld = buf2Long(e.slice(pos, ++pos));
                                            let fieldlength = buf2Long(e.slice(pos, pos + 2));
                                            pos += 2;
                                            let opcKey = buf2String(e.slice(pos, pos + fieldlength));
                                            pos += fieldlength;
                                            jsonRes.key = opcKey;
                                            fld = buf2Long(e.slice(pos, ++pos));
                                            fieldlength = buf2Long(e.slice(pos, pos + 2));
                                            pos += 2;
                                            let data = buf2String(e.slice(pos, pos + fieldlength));
                                            pos += fieldlength;
                                            jsonRes.scrips = JSON.parse(data)["data"];
                                            break;
                                        case BinRespStat.NOT_OK:
                                            jsonRes.stat = STAT.NOT_OK;
                                            jsonRes.type = RespTypeValues.OPC;
                                            jsonRes.msg = "failed";
                                            jsonRes.stCode = 11040;
                                            break
                                    }
                                    return sendJsonArrResp(jsonRes)
                                } else {
                                    return null
                                }
                            }
                        }
                    }
                }
            }
        };
        this.getStatus = function(c, d) {
            let status = BinRespStat.NOT_OK;
            let fieldCount = buf2Long(c.slice(d, ++d));
            if (fieldCount > 0) {
                let fld = buf2Long(c.slice(d, ++d));
                let fieldlength = buf2Long(c.slice(d, d + 2));
                d += 2;
                status = buf2String(c.slice(d, d + fieldlength));
                d += fieldlength
            }
            return status
        };
        this.getNewTopicData = function(c) {
            let feedType = c.split("|")[0];
            let topic = null;
            switch (feedType) {
                case TopicTypes.SCRIP:
                    topic = new ScripTopicData();
                    break;
                case TopicTypes.INDEX:
                    topic = new IndexTopicData();
                    break;
                case TopicTypes.DEPTH:
                    topic = new DepthTopicData();
                    break
            }
            return topic
        }
    }
    return a
}());

function loadScript(a, c) {
    let head = document.getElementsByTagName("head")[0];
    let script = document.createElement("script");
    script.src = a;
    script.type = "text/javascript";
    if (c != null && typeof c !== "undefined") {
        script.onload = c;
        script.onreadystatechange = function() {
            if (this.readyState == "complete") {
                if (c != undefined) {
                    c()
                }
            }
        }
    }
    head.appendChild(script)
}

function loadAllJScripFiles() {
    if (typeof isSingleLib === "undefined") {
        loadScript("../lib/util.js", null);
        loadScript("../lib/bytedata.js", null);
        loadScript("../lib/hspreparerequest.js", null);
        loadScript("../lib/hswrapper.js", function() {
            loadScript("../lib/topicdata.js", function() {
                loadScript("../lib/scriptopicdata.js", null);
                loadScript("../lib/depthtopicdata.js", null);
                loadScript("../lib/indextopicdata.js", null)
            });
            loadScript("../lib/datatype.js", function() {
                loadScript("../lib/constants.js", function() {})
            });
            loadScript("../lib/pako.js", null)
        })
    }
}
loadAllJScripFiles();
var userSocket = null;
var ws = null;
var hsWrapper = null;
var HSWebSocket = (function() {
    function a(c) {
        userSocket = this;
        userSocket.OPEN = 0;
        userSocket.readyState = 0;
        this.url = c;
        startServer(this.url);
        this.send = function(d) {
            let reqJson = JSON.parse(d);
            HSDebug(reqJson);
            let type = reqJson[Keys.TYPE];
            let req = null;
            let scrips = reqJson[Keys.SCRIPS];
            let channelnum = reqJson[Keys.CHANNEL_NUM];
            switch (type) {
                case ReqTypeValues.CONNECTION:
                    if (reqJson[Keys.USER_ID] !== undefined) {
                        let user = reqJson[Keys.USER_ID];
                        req = prepareConnectionRequest(user)
                    } else {
                        if (reqJson[Keys.SESSION_ID] !== undefined) {
                            let sessionId = reqJson[Keys.SESSION_ID];
                            req = prepareConnectionRequest(sessionId)
                        } else {
                            if (reqJson[Keys.AUTORIZATION] !== undefined) {
                                let jwt = reqJson[Keys.AUTORIZATION];
                                let redisKey = reqJson[Keys.SID];
                                if (jwt && redisKey) {
                                    req = prepareConnectionRequest2(jwt, redisKey)
                                } else {
                                    console.error("Authorization mode is enabled: Authorization or Sid not found !")
                                }
                            } else {
                                console.error("Invalid conn mode !")
                            }
                        }
                    }
                    break;
                case ReqTypeValues.SCRIP_SUBS:
                    req = prepareSubsUnSubsRequest(scrips, BinRespTypes.SUBSCRIBE_TYPE, SCRIP_PREFIX, channelnum);
                    break;
                case ReqTypeValues.SCRIP_UNSUBS:
                    req = prepareSubsUnSubsRequest(scrips, BinRespTypes.UNSUBSCRIBE_TYPE, SCRIP_PREFIX, channelnum);
                    break;
                case ReqTypeValues.INDEX_SUBS:
                    req = prepareSubsUnSubsRequest(scrips, BinRespTypes.SUBSCRIBE_TYPE, INDEX_PREFIX, channelnum);
                    break;
                case ReqTypeValues.INDEX_UNSUBS:
                    req = prepareSubsUnSubsRequest(scrips, BinRespTypes.UNSUBSCRIBE_TYPE, INDEX_PREFIX, channelnum);
                    break;
                case ReqTypeValues.DEPTH_SUBS:
                    req = prepareSubsUnSubsRequest(scrips, BinRespTypes.SUBSCRIBE_TYPE, DEPTH_PREFIX, channelnum);
                    break;
                case ReqTypeValues.DEPTH_UNSUBS:
                    req = prepareSubsUnSubsRequest(scrips, BinRespTypes.UNSUBSCRIBE_TYPE, DEPTH_PREFIX, channelnum);
                    break;
                case ReqTypeValues.CHANNEL_PAUSE:
                    channelnum = reqJson[Keys.CHANNEL_NUMS];
                    req = prepareChannelRequest(BinRespTypes.CHPAUSE_TYPE, channelnum);
                    break;
                case ReqTypeValues.CHANNEL_RESUME:
                    channelnum = reqJson[Keys.CHANNEL_NUMS];
                    req = prepareChannelRequest(BinRespTypes.CHRESUME_TYPE, channelnum);
                    break;
                case ReqTypeValues.SNAP_MW:
                    req = prepareSnapshotRequest(scrips, BinRespTypes.SNAPSHOT, SCRIP_PREFIX);
                    break;
                case ReqTypeValues.SNAP_DP:
                    req = prepareSnapshotRequest(scrips, BinRespTypes.SNAPSHOT, DEPTH_PREFIX);
                    break;
                case ReqTypeValues.SNAP_IF:
                    req = prepareSnapshotRequest(scrips, BinRespTypes.SNAPSHOT, INDEX_PREFIX);
                    break;
                case ReqTypeValues.OPC_SUBS:
                    req = getOpChainSubsRequest(reqJson[Keys.OPC_KEY], reqJson[Keys.STK_PRC], reqJson[Keys.HIGH_STK], reqJson[Keys.LOW_STK], channelnum);
                    break;
                case ReqTypeValues.THROTTLING_INTERVAL:
                    req = prepareThrottlingIntervalRequest(scrips);
                    break;
                case ReqTypeValues.LOG:
                    enableLog(reqJson.enable);
                    break;
                default:
                    req = null;
                    break
            }
            if (ws && req) {
                ws.send(req)
            } else {
                console.error("Unable to send request !, Reason: Connection faulty or request not valid !")
            }
        };
        this.close = function() {
            ws.close();
            userSocket.OPEN = 0;
            userSocket.readyState = 0;
            ws = null;
            hsWrapper = null
        }
    }
    return a
}());

function startServer(a) {
    if (("WebSocket" in window)) {
        ws = new WebSocket(a)
    } else {
        if (("MozWebSocket" in window)) {
            ws = new MozWebSocket(a)
        } else {
            HSDebug("WebSocket not supported!")
        }
    }
    if (ws) {
        ws.binaryType = "arraybuffer";
        hsWrapper = new HSWrapper()
    } else {
        HSDebug("WebSocket not initialized!")
    }
    ws.onopen = function() {
        userSocket.OPEN = 1;
        userSocket.readyState = 1;
        userSocket.onopen()
    };
    ws.onmessage = function(c) {
        let outData = null;
        let inData = c.data;
        if (inData instanceof ArrayBuffer) {
            let jsonData = hsWrapper.parseData(inData);
            if (jsonData) {
                outData = isEncyptOut ? encodeData(jsonData) : jsonData
            }
        } else {
            outData = isEncyptIn ? (isEncyptOut ? inData : decodeData(inData)) : (isEncyptOut ? encodeData(inData) : inData)
        }
        HSDebug(outData);
        if (outData) {
            userSocket.onmessage(outData)
        }
    };
    ws.onclose = function() {
        userSocket.onclose()
    };
    ws.onerror = function() {
        userSocket.OPEN = 0;
        userSocket.readyState = 0;
        userSocket.onerror()
    }
}
var TopicData = (function() {
    function a(c) {
        this.feedType = c;
        this.exchange = null;
        this.symbol = null;
        this.tSymbol = null;
        this.multiplier = 1;
        this.precision = 2;
        this.precisionValue = 100;
        this.jsonArray = null;
        this.fieldDataArray = [];
        this.updatedFieldsArray = [];
        this.fieldDataArray[STRING_INDEX.NAME] = c;
        this.getKey = function() {
            return exchange.concat("|", this.symbol)
        };
        this.setLongValues = function(e, d) {
            if (this.fieldDataArray[e] != d && d != TRASH_VAL) {
                this.fieldDataArray[e] = d;
                this.updatedFieldsArray[e] = true
            }
        };
        this.clearFieldDataArray = function() {
            this.fieldDataArray.length = this.updatedFieldsArray.length = 0
        };
        this.setStringValues = function(e, d) {
            switch (e) {
                case STRING_INDEX.SYMBOL:
                    this.symbol = d;
                    this.fieldDataArray[STRING_INDEX.SYMBOL] = d;
                    break;
                case STRING_INDEX.EXCHG:
                    this.exchange = d;
                    this.fieldDataArray[STRING_INDEX.EXCHG] = d;
                    break;
                case STRING_INDEX.TSYMBOL:
                    this.tSymbol = d;
                    this.fieldDataArray[STRING_INDEX.TSYMBOL] = d;
                    this.updatedFieldsArray[STRING_INDEX.TSYMBOL] = true;
                    break
            }
        };
        this.prepareCommonData = function() {
            this.updatedFieldsArray[STRING_INDEX.NAME] = true;
            this.updatedFieldsArray[STRING_INDEX.EXCHG] = true;
            this.updatedFieldsArray[STRING_INDEX.SYMBOL] = true
        }
    }
    return a
}());
var ScripTopicData = (function() {
    function a() {
        TopicData.call(this, TopicTypes.SCRIP);
        this.setMultiplierAndPrec = function() {
            if (this.updatedFieldsArray[SCRIP_INDEX.PRECISION]) {
                this.precision = this.fieldDataArray[SCRIP_INDEX.PRECISION];
                this.precisionValue = Math.pow(10, this.precision)
            }
            if (this.updatedFieldsArray[SCRIP_INDEX.MULTIPLIER]) {
                this.multiplier = this.fieldDataArray[SCRIP_INDEX.MULTIPLIER]
            }
        };
        this.prepareData = function() {
            this.prepareCommonData();
            if (this.updatedFieldsArray[SCRIP_INDEX.LTP] || this.updatedFieldsArray[SCRIP_INDEX.CLOSE]) {
                let ltp = this.fieldDataArray[SCRIP_INDEX.LTP];
                let close = this.fieldDataArray[SCRIP_INDEX.CLOSE];
                if (ltp != undefined && close != undefined) {
                    let change = ltp - close;
                    this.fieldDataArray[SCRIP_INDEX.CHANGE] = change;
                    this.updatedFieldsArray[SCRIP_INDEX.CHANGE] = true;
                    this.fieldDataArray[SCRIP_INDEX.PERCHANGE] = (change / close * 100).toFixed(this.precision);
                    this.updatedFieldsArray[SCRIP_INDEX.PERCHANGE] = true
                }
            }
            if (this.updatedFieldsArray[SCRIP_INDEX.VOLUME] || this.updatedFieldsArray[SCRIP_INDEX.VWAP]) {
                let volume = this.fieldDataArray[SCRIP_INDEX.VOLUME];
                let vwap = this.fieldDataArray[SCRIP_INDEX.VWAP];
                if (volume != undefined && vwap != undefined) {
                    this.fieldDataArray[SCRIP_INDEX.TURNOVER] = volume * vwap;
                    this.updatedFieldsArray[SCRIP_INDEX.TURNOVER] = true
                }
            }
            //console.log("\nScrip::" + this.feedType + "|" + this.exchange + "|" + this.symbol);
            let jsonRes = {};
            for (let index = 0; index < SCRIP_MAPPING.length; index++) {
                let dataType = SCRIP_MAPPING[index];
                let val = this.fieldDataArray[index];
                if (this.updatedFieldsArray[index] && val != undefined && dataType) {
                    if (dataType.type == FieldTypes.FLOAT32) {
                        val = (val / (this.multiplier * this.precisionValue)).toFixed(this.precision)
                    } else {
                        if (dataType.type == FieldTypes.DATE) {
                            val = getFormatDate(val)
                        }
                    }
                    //console.log(index + ":" + dataType.name + ":" + val.toString());
                    jsonRes[dataType.name] = val.toString()
                }
            }
            this.updatedFieldsArray = [];
            return jsonRes
        }
    }
    return a
}());
var DepthTopicData = (function() {
    function a() {
        TopicData.call(this, TopicTypes.DEPTH);
        this.setMultiplierAndPrec = function() {
            if (this.updatedFieldsArray[DEPTH_INDEX.PRECISION]) {
                this.precision = this.fieldDataArray[DEPTH_INDEX.PRECISION];
                this.precisionValue = Math.pow(10, this.precision)
            }
            if (this.updatedFieldsArray[DEPTH_INDEX.MULTIPLIER]) {
                this.multiplier = this.fieldDataArray[DEPTH_INDEX.MULTIPLIER]
            }
        };
        this.prepareData = function() {
            this.prepareCommonData();
            console.log("\nDepth::" + this.feedType + "|" + this.exchange + "|" + this.symbol);
            let jsonRes = {};
            for (var d = 0; d < DEPTH_MAPPING.length; d++) {
                var c = DEPTH_MAPPING[d];
                var e = this.fieldDataArray[d];
                if (this.updatedFieldsArray[d] && e != undefined && c) {
                    if (c.type == FieldTypes.FLOAT32) {
                        e = (e / (this.multiplier * this.precisionValue)).toFixed(this.precision)
                    } else {
                        if (c.type == FieldTypes.DATE) {
                            e = getFormatDate(e)
                        }
                    }
                    console.log(d + ":" + c.name + ":" + e.toString());
                    jsonRes[c.name] = e.toString()
                }
            }
            this.updatedFieldsArray = [];
            return jsonRes
        }
    }
    return a
}());
var IndexTopicData = (function() {
    function a() {
        TopicData.call(this, TopicTypes.INDEX);
        this.setMultiplierAndPrec = function() {
            if (this.updatedFieldsArray[INDEX_INDEX.PRECISION]) {
                this.precision = this.fieldDataArray[INDEX_INDEX.PRECISION];
                this.precisionValue = Math.pow(10, this.precision)
            }
            if (this.updatedFieldsArray[INDEX_INDEX.MULTIPLIER]) {
                this.multiplier = this.fieldDataArray[INDEX_INDEX.MULTIPLIER]
            }
        };
        this.prepareData = function() {
            this.prepareCommonData();
            if (this.updatedFieldsArray[INDEX_INDEX.LTP] || this.updatedFieldsArray[INDEX_INDEX.CLOSE]) {
                let ltp = this.fieldDataArray[INDEX_INDEX.LTP];
                let close = this.fieldDataArray[INDEX_INDEX.CLOSE];
                if (ltp != undefined && close != undefined) {
                    let change = ltp - close;
                    this.fieldDataArray[INDEX_INDEX.CHANGE] = change;
                    this.updatedFieldsArray[INDEX_INDEX.CHANGE] = true;
                    this.fieldDataArray[INDEX_INDEX.PERCHANGE] = (change / close * 100).toFixed(this.precision);
                    this.updatedFieldsArray[INDEX_INDEX.PERCHANGE] = true
                }
            }
            // console.log("\nIndex::" + this.feedType + "|" + this.exchange + "|" + this.symbol);
            let jsonRes = {};
            for (let index = 0; index < INDEX_MAPPING.length; index++) {
                let dataType = INDEX_MAPPING[index];
                let val = this.fieldDataArray[index];
                if (this.updatedFieldsArray[index] && val != undefined && dataType) {
                    if (dataType.type == FieldTypes.FLOAT32) {
                        val = (val / (this.multiplier * this.precisionValue)).toFixed(this.precision)
                    } else {
                        if (dataType.type == FieldTypes.DATE) {
                            val = getFormatDate(val)
                        }
                    }
                    // console.log(index + ":" + dataType.name + ":" + val.toString());
                    jsonRes[dataType.name] = val.toString()
                }
            }
            this.updatedFieldsArray = [];
            return jsonRes
        }
    }
    return a
}());
! function(a) {
    if ("object" == typeof exports && "undefined" != typeof module) {
        module.exports = a()
    } else {
        if ("function" == typeof define && define.amd) {
            define([], a)
        } else {
            var c;
            "undefined" != typeof window ? c = window : "undefined" != typeof global ? c = global : "undefined" != typeof self && (c = self), c.pako = a()
        }
    }
}(function() {
    return function a(h, c, d) {
        function k(p, q) {
            if (!c[p]) {
                if (!h[p]) {
                    var e = "function" == typeof require && require;
                    if (!q && e) {
                        return e(p, !0)
                    }
                    if (g) {
                        return g(p, !0)
                    }
                    throw new Error("Cannot find module '" + p + "'")
                }
                var m = c[p] = {
                    exports: {}
                };
                h[p][0].call(m.exports, function(o) {
                    var l = h[p][1][o];
                    return k(l ? l : o)
                }, m, m.exports, a, h, c, d)
            }
            return c[p].exports
        }
        for (var g = "function" == typeof require && require, f = 0; f < d.length; f++) {
            k(d[f])
        }
        return k
    }({
        1: [function(f, k) {
            var c = f("./lib/utils/common").assign,
                d = f("./lib/deflate"),
                l = f("./lib/inflate"),
                h = f("./lib/zlib/constants"),
                g = {};
            c(g, d, l, h), k.exports = g
        }, {
            "./lib/deflate": 2,
            "./lib/inflate": 3,
            "./lib/utils/common": 4,
            "./lib/zlib/constants": 7
        }],
        2: [function(q, G, K) {
            function C(d, f) {
                var c = new k(f);
                if (c.push(d, !0), c.err) {
                    throw c.msg
                }
                return c.result
            }

            function z(c, d) {
                return d = d || {}, d.raw = !0, C(c, d)
            }

            function x(c, d) {
                return d = d || {}, d.gzip = !0, C(c, d)
            }
            var v = q("./zlib/deflate.js"),
                y = q("./utils/common"),
                B = q("./utils/strings"),
                D = q("./zlib/messages"),
                H = q("./zlib/zstream"),
                F = 0,
                L = 4,
                p = 0,
                I = 1,
                J = -1,
                E = 0,
                A = 8,
                k = function(d) {
                    this.options = y.assign({
                        level: J,
                        method: A,
                        chunkSize: 16384,
                        windowBits: 15,
                        memLevel: 8,
                        strategy: E,
                        to: ""
                    }, d || {});
                    var f = this.options;
                    f.raw && f.windowBits > 0 ? f.windowBits = -f.windowBits : f.gzip && f.windowBits > 0 && f.windowBits < 16 && (f.windowBits += 16), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new H, this.strm.avail_out = 0;
                    var c = v.deflateInit2(this.strm, f.level, f.method, f.windowBits, f.memLevel, f.strategy);
                    if (c !== p) {
                        throw new Error(D[c])
                    }
                    f.header && v.deflateSetHeader(this.strm, f.header)
                };
            k.prototype.push = function(f, h) {
                var c, d, l = this.strm,
                    g = this.options.chunkSize;
                if (this.ended) {
                    return !1
                }
                d = h === ~~h ? h : h === !0 ? L : F, l.input = "string" == typeof f ? B.string2buf(f) : f, l.next_in = 0, l.avail_in = l.input.length;
                do {
                    if (0 === l.avail_out && (l.output = new y.Buf8(g), l.next_out = 0, l.avail_out = g), c = v.deflate(l, d), c !== I && c !== p) {
                        return this.onEnd(c), this.ended = !0, !1
                    }(0 === l.avail_out || 0 === l.avail_in && d === L) && this.onData("string" === this.options.to ? B.buf2binstring(y.shrinkBuf(l.output, l.next_out)) : y.shrinkBuf(l.output, l.next_out))
                } while ((l.avail_in > 0 || 0 === l.avail_out) && c !== I);
                return d === L ? (c = v.deflateEnd(this.strm), this.onEnd(c), this.ended = !0, c === p) : !0
            }, k.prototype.onData = function(c) {
                this.chunks.push(c)
            }, k.prototype.onEnd = function(c) {
                c === p && (this.result = "string" === this.options.to ? this.chunks.join("") : y.flattenChunks(this.chunks)), this.chunks = [], this.err = c, this.msg = this.strm.msg
            }, K.Deflate = k, K.deflate = C, K.deflateRaw = z, K.gzip = x
        }, {
            "./utils/common": 4,
            "./utils/strings": 5,
            "./zlib/deflate.js": 9,
            "./zlib/messages": 14,
            "./zlib/zstream": 16
        }],
        3: [function(z, v, x) {
            function p(f, h) {
                var d = new y(h);
                if (d.push(f, !0), d.err) {
                    throw d.msg
                }
                return d.result
            }

            function k(d, f) {
                return f = f || {}, f.raw = !0, p(d, f)
            }
            var c = z("./zlib/inflate.js"),
                A = z("./utils/common"),
                g = z("./utils/strings"),
                m = z("./zlib/constants"),
                q = z("./zlib/messages"),
                w = z("./zlib/zstream"),
                u = z("./zlib/gzheader"),
                y = function(f) {
                    this.options = A.assign({
                        chunkSize: 16384,
                        windowBits: 0,
                        to: ""
                    }, f || {});
                    var h = this.options;
                    h.raw && h.windowBits >= 0 && h.windowBits < 16 && (h.windowBits = -h.windowBits, 0 === h.windowBits && (h.windowBits = -15)), !(h.windowBits >= 0 && h.windowBits < 16) || f && f.windowBits || (h.windowBits += 32), h.windowBits > 15 && h.windowBits < 48 && 0 === (15 & h.windowBits) && (h.windowBits |= 15), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new w, this.strm.avail_out = 0;
                    var d = c.inflateInit2(this.strm, h.windowBits);
                    if (d !== m.Z_OK) {
                        throw new Error(q[d])
                    }
                    this.header = new u, c.inflateGetHeader(this.strm, this.header)
                };
            y.prototype.push = function(F, B) {
                var D, o, l, r, C, s = this.strm,
                    E = this.options.chunkSize;
                if (this.ended) {
                    return !1
                }
                o = B === ~~B ? B : B === !0 ? m.Z_FINISH : m.Z_NO_FLUSH, s.input = "string" == typeof F ? g.binstring2buf(F) : F, s.next_in = 0, s.avail_in = s.input.length;
                do {
                    if (0 === s.avail_out && (s.output = new A.Buf8(E), s.next_out = 0, s.avail_out = E), D = c.inflate(s, m.Z_NO_FLUSH), D !== m.Z_STREAM_END && D !== m.Z_OK) {
                        return this.onEnd(D), this.ended = !0, !1
                    }
                    s.next_out && (0 === s.avail_out || D === m.Z_STREAM_END || 0 === s.avail_in && o === m.Z_FINISH) && ("string" === this.options.to ? (l = g.utf8border(s.output, s.next_out), r = s.next_out - l, C = g.buf2string(s.output, l), s.next_out = r, s.avail_out = E - r, r && A.arraySet(s.output, s.output, l, r, 0), this.onData(C)) : this.onData(A.shrinkBuf(s.output, s.next_out)))
                } while (s.avail_in > 0 && D !== m.Z_STREAM_END);
                return D === m.Z_STREAM_END && (o = m.Z_FINISH), o === m.Z_FINISH ? (D = c.inflateEnd(this.strm), this.onEnd(D), this.ended = !0, D === m.Z_OK) : !0
            }, y.prototype.onData = function(d) {
                this.chunks.push(d)
            }, y.prototype.onEnd = function(d) {
                d === m.Z_OK && (this.result = "string" === this.options.to ? this.chunks.join("") : A.flattenChunks(this.chunks)), this.chunks = [], this.err = d, this.msg = this.strm.msg
            }, x.Inflate = y, x.inflate = p, x.inflateRaw = k, x.ungzip = p
        }, {
            "./utils/common": 4,
            "./utils/strings": 5,
            "./zlib/constants": 7,
            "./zlib/gzheader": 10,
            "./zlib/inflate.js": 12,
            "./zlib/messages": 14,
            "./zlib/zstream": 16
        }],
        4: [function(f, h, c) {
            var d = "undefined" != typeof Uint8Array && "undefined" != typeof Uint16Array && "undefined" != typeof Int32Array;
            c.assign = function(o) {
                for (var p = Array.prototype.slice.call(arguments, 1); p.length;) {
                    var l = p.shift();
                    if (l) {
                        if ("object" != typeof l) {
                            throw new TypeError(l + "must be non-object")
                        }
                        for (var m in l) {
                            l.hasOwnProperty(m) && (o[m] = l[m])
                        }
                    }
                }
                return o
            }, c.shrinkBuf = function(l, m) {
                return l.length === m ? l : l.subarray ? l.subarray(0, m) : (l.length = m, l)
            };
            var k = {
                    arraySet: function(o, q, l, m, s) {
                        if (q.subarray && o.subarray) {
                            return void o.set(q.subarray(l, l + m), s)
                        }
                        for (var p = 0; m > p; p++) {
                            o[s + p] = q[l + p]
                        }
                    },
                    flattenChunks: function(o) {
                        var u, l, m, v, q, p;
                        for (m = 0, u = 0, l = o.length; l > u; u++) {
                            m += o[u].length
                        }
                        for (p = new Uint8Array(m), v = 0, u = 0, l = o.length; l > u; u++) {
                            q = o[u], p.set(q, v), v += q.length
                        }
                        return p
                    }
                },
                g = {
                    arraySet: function(o, q, l, m, s) {
                        for (var p = 0; m > p; p++) {
                            o[s + p] = q[l + p]
                        }
                    },
                    flattenChunks: function(e) {
                        return [].concat.apply([], e)
                    }
                };
            c.setTyped = function(e) {
                e ? (c.Buf8 = Uint8Array, c.Buf16 = Uint16Array, c.Buf32 = Int32Array, c.assign(c, k)) : (c.Buf8 = Array, c.Buf16 = Array, c.Buf32 = Array, c.assign(c, g))
            }, c.setTyped(d)
        }, {}],
        5: [function(u, p, q) {
            function k(o, r) {
                if (65537 > r && (o.subarray && v || !o.subarray && c)) {
                    return String.fromCharCode.apply(null, f.shrinkBuf(o, r))
                }
                for (var h = "", l = 0; r > l; l++) {
                    h += String.fromCharCode(o[l])
                }
                return h
            }
            var f = u("./common"),
                c = !0,
                v = !0;
            try {
                String.fromCharCode.apply(null, [0])
            } catch (d) {
                c = !1
            }
            try {
                String.fromCharCode.apply(null, new Uint8Array(1))
            } catch (d) {
                v = !1
            }
            for (var g = new f.Buf8(256), m = 0; 256 > m; m++) {
                g[m] = m >= 252 ? 6 : m >= 248 ? 5 : m >= 240 ? 4 : m >= 224 ? 3 : m >= 192 ? 2 : 1
            }
            g[254] = g[254] = 1, q.string2buf = function(y) {
                var B, w, x, A, z, C = y.length,
                    h = 0;
                for (A = 0; C > A; A++) {
                    w = y.charCodeAt(A), 55296 === (64512 & w) && C > A + 1 && (x = y.charCodeAt(A + 1), 56320 === (64512 & x) && (w = 65536 + (w - 55296 << 10) + (x - 56320), A++)), h += 128 > w ? 1 : 2048 > w ? 2 : 65536 > w ? 3 : 4
                }
                for (B = new f.Buf8(h), z = 0, A = 0; h > z; A++) {
                    w = y.charCodeAt(A), 55296 === (64512 & w) && C > A + 1 && (x = y.charCodeAt(A + 1), 56320 === (64512 & x) && (w = 65536 + (w - 55296 << 10) + (x - 56320), A++)), 128 > w ? B[z++] = w : 2048 > w ? (B[z++] = 192 | w >>> 6, B[z++] = 128 | 63 & w) : 65536 > w ? (B[z++] = 224 | w >>> 12, B[z++] = 128 | w >>> 6 & 63, B[z++] = 128 | 63 & w) : (B[z++] = 240 | w >>> 18, B[z++] = 128 | w >>> 12 & 63, B[z++] = 128 | w >>> 6 & 63, B[z++] = 128 | 63 & w)
                }
                return B
            }, q.buf2binstring = function(e) {
                return k(e, e.length)
            }, q.binstring2buf = function(o) {
                for (var r = new f.Buf8(o.length), h = 0, l = r.length; l > h; h++) {
                    r[h] = o.charCodeAt(h)
                }
                return r
            }, q.buf2string = function(w, A) {
                var l, C, z, y, B = A || w.length,
                    x = new Array(2 * B);
                for (C = 0, l = 0; B > l;) {
                    if (z = w[l++], 128 > z) {
                        x[C++] = z
                    } else {
                        if (y = g[z], y > 4) {
                            x[C++] = 65533, l += y - 1
                        } else {
                            for (z &= 2 === y ? 31 : 3 === y ? 15 : 7; y > 1 && B > l;) {
                                z = z << 6 | 63 & w[l++], y--
                            }
                            y > 1 ? x[C++] = 65533 : 65536 > z ? x[C++] = z : (z -= 65536, x[C++] = 55296 | z >> 10 & 1023, x[C++] = 56320 | 1023 & z)
                        }
                    }
                }
                return k(x, C)
            }, q.utf8border = function(l, o) {
                var h;
                for (o = o || l.length, o > l.length && (o = l.length), h = o - 1; h >= 0 && 128 === (192 & l[h]);) {
                    h--
                }
                return 0 > h ? o : 0 === h ? o : h + g[l[h]] > o ? h : o
            }
        }, {
            "./common": 4
        }],
        6: [function(d, f) {
            function c(k, o, g, h) {
                for (var p = 65535 & k | 0, m = k >>> 16 & 65535 | 0, l = 0; 0 !== g;) {
                    l = g > 2000 ? 2000 : g, g -= l;
                    do {
                        p = p + o[h++] | 0, m = m + p | 0
                    } while (--l);
                    p %= 65521, m %= 65521
                }
                return p | m << 16 | 0
            }
            f.exports = c
        }, {}],
        7: [function(c, d) {
            d.exports = {
                Z_NO_FLUSH: 0,
                Z_PARTIAL_FLUSH: 1,
                Z_SYNC_FLUSH: 2,
                Z_FULL_FLUSH: 3,
                Z_FINISH: 4,
                Z_BLOCK: 5,
                Z_TREES: 6,
                Z_OK: 0,
                Z_STREAM_END: 1,
                Z_NEED_DICT: 2,
                Z_ERRNO: -1,
                Z_STREAM_ERROR: -2,
                Z_DATA_ERROR: -3,
                Z_BUF_ERROR: -5,
                Z_NO_COMPRESSION: 0,
                Z_BEST_SPEED: 1,
                Z_BEST_COMPRESSION: 9,
                Z_DEFAULT_COMPRESSION: -1,
                Z_FILTERED: 1,
                Z_HUFFMAN_ONLY: 2,
                Z_RLE: 3,
                Z_FIXED: 4,
                Z_DEFAULT_STRATEGY: 0,
                Z_BINARY: 0,
                Z_TEXT: 1,
                Z_UNKNOWN: 2,
                Z_DEFLATED: 8
            }
        }, {}],
        8: [function(f, g) {
            function c() {
                for (var m, o = [], k = 0; 256 > k; k++) {
                    m = k;
                    for (var l = 0; 8 > l; l++) {
                        m = 1 & m ? 3988292384 ^ m >>> 1 : m >>> 1
                    }
                    o[k] = m
                }
                return o
            }

            function d(m, u, k, l) {
                var q = h,
                    p = l + k;
                m = -1 ^ m;
                for (var v = l; p > v; v++) {
                    m = m >>> 8 ^ q[255 & (m ^ u[v])]
                }
                return -1 ^ m
            }
            var h = c();
            g.exports = d
        }, {}],
        9: [function(ao, aH, aM) {
            function aC(c, d) {
                return c.msg = a7[d], d
            }

            function aw(c) {
                return (c << 1) - (c > 4 ? 9 : 0)
            }

            function aq(c) {
                for (var d = c.length; --d >= 0;) {
                    c[d] = 0
                }
            }

            function ap(d) {
                var f = d.state,
                    c = f.pending;
                c > d.avail_out && (c = d.avail_out), 0 !== c && (bi.arraySet(d.output, f.pending_buf, f.pending_out, c, d.next_out), d.next_out += c, f.pending_out += c, d.total_out += c, d.avail_out -= c, f.pending -= c, 0 === f.pending && (f.pending_out = 0))
            }

            function av(c, d) {
                aO._tr_flush_block(c, c.block_start >= 0 ? c.block_start : -1, c.strstart - c.block_start, d), c.block_start = c.strstart, ap(c.strm)
            }

            function az(c, d) {
                c.pending_buf[c.pending++] = d
            }

            function aD(c, d) {
                c.pending_buf[c.pending++] = d >>> 8 & 255, c.pending_buf[c.pending++] = 255 & d
            }

            function aI(f, g, c, d) {
                var h = f.avail_in;
                return h > d && (h = d), 0 === h ? 0 : (f.avail_in -= h, bi.arraySet(g, f.input, f.next_in, h, c), 1 === f.state.wrap ? f.adler = aX(f.adler, g, h, c) : 2 === f.state.wrap && (f.adler = bg(f.adler, g, h, c)), f.next_in += h, f.total_in += h, h)
            }

            function aG(D, x) {
                var A, q, m = D.max_chain_length,
                    g = D.strstart,
                    E = D.prev_length,
                    k = D.nice_match,
                    p = D.strstart > D.w_size - a1 ? D.strstart - (D.w_size - a1) : 0,
                    v = D.window,
                    y = D.w_mask,
                    w = D.prev,
                    B = D.strstart + bq,
                    C = v[g + E - 1],
                    z = v[g + E];
                D.prev_length >= D.good_match && (m >>= 2), k > D.lookahead && (k = D.lookahead);
                do {
                    if (A = x, v[A + E] === z && v[A + E - 1] === C && v[A] === v[g] && v[++A] === v[g + 1]) {
                        g += 2, A++;
                        do {} while (v[++g] === v[++A] && v[++g] === v[++A] && v[++g] === v[++A] && v[++g] === v[++A] && v[++g] === v[++A] && v[++g] === v[++A] && v[++g] === v[++A] && v[++g] === v[++A] && B > g);
                        if (q = bq - (B - g), g = B - bq, q > E) {
                            if (D.match_start = x, E = q, q >= k) {
                                break
                            }
                            C = v[g + E - 1], z = v[g + E]
                        }
                    }
                } while ((x = w[x & y]) > p && 0 !== --m);
                return E <= D.lookahead ? E : D.lookahead
            }

            function aN(f) {
                var k, c, d, l, h, g = f.w_size;
                do {
                    if (l = f.window_size - f.lookahead - f.strstart, f.strstart >= g + (g - a1)) {
                        bi.arraySet(f.window, f.window, g, g, 0), f.match_start -= g, f.strstart -= g, f.block_start -= g, c = f.hash_size, k = c;
                        do {
                            d = f.head[--k], f.head[k] = d >= g ? d - g : 0
                        } while (--c);
                        c = g, k = c;
                        do {
                            d = f.prev[--k], f.prev[k] = d >= g ? d - g : 0
                        } while (--c);
                        l += g
                    }
                    if (0 === f.strm.avail_in) {
                        break
                    }
                    if (c = aI(f.strm, f.window, f.strstart + f.lookahead, l), f.lookahead += c, f.lookahead + f.insert >= aE) {
                        for (h = f.strstart - f.insert, f.ins_h = f.window[h], f.ins_h = (f.ins_h << f.hash_shift ^ f.window[h + 1]) & f.hash_mask; f.insert && (f.ins_h = (f.ins_h << f.hash_shift ^ f.window[h + aE - 1]) & f.hash_mask, f.prev[h & f.w_mask] = f.head[f.ins_h], f.head[f.ins_h] = h, h++, f.insert--, !(f.lookahead + f.insert < aE));) {}
                    }
                } while (f.lookahead < a1 && 0 !== f.strm.avail_in)
            }

            function an(f, g) {
                var c = 65535;
                for (c > f.pending_buf_size - 5 && (c = f.pending_buf_size - 5);;) {
                    if (f.lookahead <= 1) {
                        if (aN(f), 0 === f.lookahead && g === a2) {
                            return ad
                        }
                        if (0 === f.lookahead) {
                            break
                        }
                    }
                    f.strstart += f.lookahead, f.lookahead = 0;
                    var d = f.block_start + c;
                    if ((0 === f.strstart || f.strstart >= d) && (f.lookahead = f.strstart - d, f.strstart = d, av(f, !1), 0 === f.strm.avail_out)) {
                        return ad
                    }
                    if (f.strstart - f.block_start >= f.w_size - a1 && (av(f, !1), 0 === f.strm.avail_out)) {
                        return ad
                    }
                }
                return f.insert = 0, g === bd ? (av(f, !0), 0 === f.strm.avail_out ? ah : ac) : f.strstart > f.block_start && (av(f, !1), 0 === f.strm.avail_out) ? ad : ad
            }

            function aJ(f, g) {
                for (var c, d;;) {
                    if (f.lookahead < a1) {
                        if (aN(f), f.lookahead < a1 && g === a2) {
                            return ad
                        }
                        if (0 === f.lookahead) {
                            break
                        }
                    }
                    if (c = 0, f.lookahead >= aE && (f.ins_h = (f.ins_h << f.hash_shift ^ f.window[f.strstart + aE - 1]) & f.hash_mask, c = f.prev[f.strstart & f.w_mask] = f.head[f.ins_h], f.head[f.ins_h] = f.strstart), 0 !== c && f.strstart - c <= f.w_size - a1 && (f.match_length = aG(f, c)), f.match_length >= aE) {
                        if (d = aO._tr_tally(f, f.strstart - f.match_start, f.match_length - aE), f.lookahead -= f.match_length, f.match_length <= f.max_lazy_match && f.lookahead >= aE) {
                            f.match_length--;
                            do {
                                f.strstart++, f.ins_h = (f.ins_h << f.hash_shift ^ f.window[f.strstart + aE - 1]) & f.hash_mask, c = f.prev[f.strstart & f.w_mask] = f.head[f.ins_h], f.head[f.ins_h] = f.strstart
                            } while (0 !== --f.match_length);
                            f.strstart++
                        } else {
                            f.strstart += f.match_length, f.match_length = 0, f.ins_h = f.window[f.strstart], f.ins_h = (f.ins_h << f.hash_shift ^ f.window[f.strstart + 1]) & f.hash_mask
                        }
                    } else {
                        d = aO._tr_tally(f, 0, f.window[f.strstart]), f.lookahead--, f.strstart++
                    }
                    if (d && (av(f, !1), 0 === f.strm.avail_out)) {
                        return ad
                    }
                }
                return f.insert = f.strstart < aE - 1 ? f.strstart : aE - 1, g === bd ? (av(f, !0), 0 === f.strm.avail_out ? ah : ac) : f.last_lit && (av(f, !1), 0 === f.strm.avail_out) ? ad : ag
            }

            function aL(f, g) {
                for (var c, d, h;;) {
                    if (f.lookahead < a1) {
                        if (aN(f), f.lookahead < a1 && g === a2) {
                            return ad
                        }
                        if (0 === f.lookahead) {
                            break
                        }
                    }
                    if (c = 0, f.lookahead >= aE && (f.ins_h = (f.ins_h << f.hash_shift ^ f.window[f.strstart + aE - 1]) & f.hash_mask, c = f.prev[f.strstart & f.w_mask] = f.head[f.ins_h], f.head[f.ins_h] = f.strstart), f.prev_length = f.match_length, f.prev_match = f.match_start, f.match_length = aE - 1, 0 !== c && f.prev_length < f.max_lazy_match && f.strstart - c <= f.w_size - a1 && (f.match_length = aG(f, c), f.match_length <= 5 && (f.strategy === aZ || f.match_length === aE && f.strstart - f.match_start > 4096) && (f.match_length = aE - 1)), f.prev_length >= aE && f.match_length <= f.prev_length) {
                        h = f.strstart + f.lookahead - aE, d = aO._tr_tally(f, f.strstart - 1 - f.prev_match, f.prev_length - aE), f.lookahead -= f.prev_length - 1, f.prev_length -= 2;
                        do {
                            ++f.strstart <= h && (f.ins_h = (f.ins_h << f.hash_shift ^ f.window[f.strstart + aE - 1]) & f.hash_mask, c = f.prev[f.strstart & f.w_mask] = f.head[f.ins_h], f.head[f.ins_h] = f.strstart)
                        } while (0 !== --f.prev_length);
                        if (f.match_available = 0, f.match_length = aE - 1, f.strstart++, d && (av(f, !1), 0 === f.strm.avail_out)) {
                            return ad
                        }
                    } else {
                        if (f.match_available) {
                            if (d = aO._tr_tally(f, 0, f.window[f.strstart - 1]), d && av(f, !1), f.strstart++, f.lookahead--, 0 === f.strm.avail_out) {
                                return ad
                            }
                        } else {
                            f.match_available = 1, f.strstart++, f.lookahead--
                        }
                    }
                }
                return f.match_available && (d = aO._tr_tally(f, 0, f.window[f.strstart - 1]), f.match_available = 0), f.insert = f.strstart < aE - 1 ? f.strstart : aE - 1, g === bd ? (av(f, !0), 0 === f.strm.avail_out ? ah : ac) : f.last_lit && (av(f, !1), 0 === f.strm.avail_out) ? ad : ag
            }

            function aF(f, k) {
                for (var c, d, l, h, g = f.window;;) {
                    if (f.lookahead <= bq) {
                        if (aN(f), f.lookahead <= bq && k === a2) {
                            return ad
                        }
                        if (0 === f.lookahead) {
                            break
                        }
                    }
                    if (f.match_length = 0, f.lookahead >= aE && f.strstart > 0 && (l = f.strstart - 1, d = g[l], d === g[++l] && d === g[++l] && d === g[++l])) {
                        h = f.strstart + bq;
                        do {} while (d === g[++l] && d === g[++l] && d === g[++l] && d === g[++l] && d === g[++l] && d === g[++l] && d === g[++l] && d === g[++l] && h > l);
                        f.match_length = bq - (h - l), f.match_length > f.lookahead && (f.match_length = f.lookahead)
                    }
                    if (f.match_length >= aE ? (c = aO._tr_tally(f, 1, f.match_length - aE), f.lookahead -= f.match_length, f.strstart += f.match_length, f.match_length = 0) : (c = aO._tr_tally(f, 0, f.window[f.strstart]), f.lookahead--, f.strstart++), c && (av(f, !1), 0 === f.strm.avail_out)) {
                        return ad
                    }
                }
                return f.insert = 0, k === bd ? (av(f, !0), 0 === f.strm.avail_out ? ah : ac) : f.last_lit && (av(f, !1), 0 === f.strm.avail_out) ? ad : ag
            }

            function ax(d, f) {
                for (var c;;) {
                    if (0 === d.lookahead && (aN(d), 0 === d.lookahead)) {
                        if (f === a2) {
                            return ad
                        }
                        break
                    }
                    if (d.match_length = 0, c = aO._tr_tally(d, 0, d.window[d.strstart]), d.lookahead--, d.strstart++, c && (av(d, !1), 0 === d.strm.avail_out)) {
                        return ad
                    }
                }
                return d.insert = 0, f === bd ? (av(d, !0), 0 === d.strm.avail_out ? ah : ac) : d.last_lit && (av(d, !1), 0 === d.strm.avail_out) ? ad : ag
            }

            function al(c) {
                c.window_size = 2 * c.w_size, aq(c.head), c.max_lazy_match = bc[c.level].max_lazy, c.good_match = bc[c.level].good_length, c.nice_match = bc[c.level].nice_length, c.max_chain_length = bc[c.level].max_chain, c.strstart = 0, c.block_start = 0, c.lookahead = 0, c.insert = 0, c.match_length = c.prev_length = aE - 1, c.match_available = 0, c.ins_h = 0
            }

            function au() {
                this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = a6, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new bi.Buf16(2 * br), this.dyn_dtree = new bi.Buf16(2 * (2 * ay + 1)), this.bl_tree = new bi.Buf16(2 * (2 * a8 + 1)), aq(this.dyn_ltree), aq(this.dyn_dtree), aq(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new bi.Buf16(bm + 1), this.heap = new bi.Buf16(2 * bj + 1), aq(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new bi.Buf16(2 * bj + 1), aq(this.depth), this.l_buf = 0, this.lit_bufsize = 0, this.last_lit = 0, this.d_buf = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0
            }

            function am(c) {
                var d;
                return c && c.state ? (c.total_in = c.total_out = 0, c.data_type = aR, d = c.state, d.pending = 0, d.pending_out = 0, d.wrap < 0 && (d.wrap = -d.wrap), d.status = d.wrap ? bp : bk, c.adler = 2 === d.wrap ? 0 : 1, d.last_flush = a2, aO._tr_init(d), a4) : aC(c, a9)
            }

            function aA(c) {
                var d = am(c);
                return d === a4 && al(c.state), d
            }

            function ak(c, d) {
                return c && c.state ? 2 !== c.state.wrap ? a9 : (c.state.gzhead = d, a4) : a9
            }

            function aj(f, k, d, p, h, g) {
                if (!f) {
                    return a9
                }
                var m = 1;
                if (k === a5 && (k = 6), 0 > p ? (m = 0, p = -p) : p > 15 && (m = 2, p -= 16), 1 > h || h > aY || d !== a6 || 8 > p || p > 15 || 0 > k || k > 9 || 0 > g || g > ba) {
                    return aC(f, a9)
                }
                8 === p && (p = 9);
                var c = new au;
                return f.state = c, c.strm = f, c.wrap = m, c.gzhead = null, c.w_bits = p, c.w_size = 1 << c.w_bits, c.w_mask = c.w_size - 1, c.hash_bits = h + 7, c.hash_size = 1 << c.hash_bits, c.hash_mask = c.hash_size - 1, c.hash_shift = ~~((c.hash_bits + aE - 1) / aE), c.window = new bi.Buf8(2 * c.w_size), c.head = new bi.Buf16(c.hash_size), c.prev = new bi.Buf16(c.w_size), c.lit_bufsize = 1 << h + 6, c.pending_buf_size = 4 * c.lit_bufsize, c.pending_buf = new bi.Buf8(c.pending_buf_size), c.d_buf = c.lit_bufsize >> 1, c.l_buf = 3 * c.lit_bufsize, c.level = k, c.strategy = g, c.method = d, aA(f)
            }

            function ai(c, d) {
                return aj(c, d, a6, aS, bn, aQ)
            }

            function bh(s, k) {
                var p, g, l, h;
                if (!s || !s.state || k > bb || 0 > k) {
                    return s ? aC(s, a9) : a9
                }
                if (g = s.state, !s.output || !s.input && 0 !== s.avail_in || g.status === bl && k !== bd) {
                    return aC(s, 0 === s.avail_out ? a3 : a9)
                }
                if (g.strm = s, p = g.last_flush, g.last_flush = k, g.status === bp) {
                    if (2 === g.wrap) {
                        s.adler = 0, az(g, 31), az(g, 139), az(g, 8), g.gzhead ? (az(g, (g.gzhead.text ? 1 : 0) + (g.gzhead.hcrc ? 2 : 0) + (g.gzhead.extra ? 4 : 0) + (g.gzhead.name ? 8 : 0) + (g.gzhead.comment ? 16 : 0)), az(g, 255 & g.gzhead.time), az(g, g.gzhead.time >> 8 & 255), az(g, g.gzhead.time >> 16 & 255), az(g, g.gzhead.time >> 24 & 255), az(g, 9 === g.level ? 2 : g.strategy >= at || g.level < 2 ? 4 : 0), az(g, 255 & g.gzhead.os), g.gzhead.extra && g.gzhead.extra.length && (az(g, 255 & g.gzhead.extra.length), az(g, g.gzhead.extra.length >> 8 & 255)), g.gzhead.hcrc && (s.adler = bg(s.adler, g.pending_buf, g.pending, 0)), g.gzindex = 0, g.status = aa) : (az(g, 0), az(g, 0), az(g, 0), az(g, 0), az(g, 0), az(g, 9 === g.level ? 2 : g.strategy >= at || g.level < 2 ? 4 : 0), az(g, bs), g.status = bk)
                    } else {
                        var q = a6 + (g.w_bits - 8 << 4) << 8,
                            r = -1;
                        r = g.strategy >= at || g.level < 2 ? 0 : g.level < 6 ? 1 : 6 === g.level ? 2 : 3, q |= r << 6, 0 !== g.strstart && (q |= af), q += 31 - q % 31, g.status = bk, aD(g, q), 0 !== g.strstart && (aD(g, s.adler >>> 16), aD(g, 65535 & s.adler)), s.adler = 1
                    }
                }
                if (g.status === aa) {
                    if (g.gzhead.extra) {
                        for (l = g.pending; g.gzindex < (65535 & g.gzhead.extra.length) && (g.pending !== g.pending_buf_size || (g.gzhead.hcrc && g.pending > l && (s.adler = bg(s.adler, g.pending_buf, g.pending - l, l)), ap(s), l = g.pending, g.pending !== g.pending_buf_size));) {
                            az(g, 255 & g.gzhead.extra[g.gzindex]), g.gzindex++
                        }
                        g.gzhead.hcrc && g.pending > l && (s.adler = bg(s.adler, g.pending_buf, g.pending - l, l)), g.gzindex === g.gzhead.extra.length && (g.gzindex = 0, g.status = aK)
                    } else {
                        g.status = aK
                    }
                }
                if (g.status === aK) {
                    if (g.gzhead.name) {
                        l = g.pending;
                        do {
                            if (g.pending === g.pending_buf_size && (g.gzhead.hcrc && g.pending > l && (s.adler = bg(s.adler, g.pending_buf, g.pending - l, l)), ap(s), l = g.pending, g.pending === g.pending_buf_size)) {
                                h = 1;
                                break
                            }
                            h = g.gzindex < g.gzhead.name.length ? 255 & g.gzhead.name.charCodeAt(g.gzindex++) : 0, az(g, h)
                        } while (0 !== h);
                        g.gzhead.hcrc && g.pending > l && (s.adler = bg(s.adler, g.pending_buf, g.pending - l, l)), 0 === h && (g.gzindex = 0, g.status = ar)
                    } else {
                        g.status = ar
                    }
                }
                if (g.status === ar) {
                    if (g.gzhead.comment) {
                        l = g.pending;
                        do {
                            if (g.pending === g.pending_buf_size && (g.gzhead.hcrc && g.pending > l && (s.adler = bg(s.adler, g.pending_buf, g.pending - l, l)), ap(s), l = g.pending, g.pending === g.pending_buf_size)) {
                                h = 1;
                                break
                            }
                            h = g.gzindex < g.gzhead.comment.length ? 255 & g.gzhead.comment.charCodeAt(g.gzindex++) : 0, az(g, h)
                        } while (0 !== h);
                        g.gzhead.hcrc && g.pending > l && (s.adler = bg(s.adler, g.pending_buf, g.pending - l, l)), 0 === h && (g.status = aV)
                    } else {
                        g.status = aV
                    }
                }
                if (g.status === aV && (g.gzhead.hcrc ? (g.pending + 2 > g.pending_buf_size && ap(s), g.pending + 2 <= g.pending_buf_size && (az(g, 255 & s.adler), az(g, s.adler >> 8 & 255), s.adler = 0, g.status = bk)) : g.status = bk), 0 !== g.pending) {
                    if (ap(s), 0 === s.avail_out) {
                        return g.last_flush = -1, a4
                    }
                } else {
                    if (0 === s.avail_in && aw(k) <= aw(p) && k !== bd) {
                        return aC(s, a3)
                    }
                }
                if (g.status === bl && 0 !== s.avail_in) {
                    return aC(s, a3)
                }
                if (0 !== s.avail_in || 0 !== g.lookahead || k !== a2 && g.status !== bl) {
                    var m = g.strategy === at ? ax(g, k) : g.strategy === aP ? aF(g, k) : bc[g.level].func(g, k);
                    if ((m === ah || m === ac) && (g.status = bl), m === ad || m === ah) {
                        return 0 === s.avail_out && (g.last_flush = -1), a4
                    }
                    if (m === ag && (k === a0 ? aO._tr_align(g) : k !== bb && (aO._tr_stored_block(g, 0, 0, !1), k === aU && (aq(g.head), 0 === g.lookahead && (g.strstart = 0, g.block_start = 0, g.insert = 0))), ap(s), 0 === s.avail_out)) {
                        return g.last_flush = -1, a4
                    }
                }
                return k !== bd ? a4 : g.wrap <= 0 ? aT : (2 === g.wrap ? (az(g, 255 & s.adler), az(g, s.adler >> 8 & 255), az(g, s.adler >> 16 & 255), az(g, s.adler >> 24 & 255), az(g, 255 & s.total_in), az(g, s.total_in >> 8 & 255), az(g, s.total_in >> 16 & 255), az(g, s.total_in >> 24 & 255)) : (aD(g, s.adler >>> 16), aD(g, 65535 & s.adler)), ap(s), g.wrap > 0 && (g.wrap = -g.wrap), 0 !== g.pending ? a4 : aT)
            }

            function aW(c) {
                var d;
                return c && c.state ? (d = c.state.status, d !== bp && d !== aa && d !== aK && d !== ar && d !== aV && d !== bk && d !== bl ? aC(c, a9) : (c.state = null, d === bk ? aC(c, aB) : a4)) : a9
            }
            var bc, bi = ao("../utils/common"),
                aO = ao("./trees"),
                aX = ao("./adler32"),
                bg = ao("./crc32"),
                a7 = ao("./messages"),
                a2 = 0,
                a0 = 1,
                aU = 3,
                bd = 4,
                bb = 5,
                a4 = 0,
                aT = 1,
                a9 = -2,
                aB = -3,
                a3 = -5,
                a5 = -1,
                aZ = 1,
                at = 2,
                aP = 3,
                ba = 4,
                aQ = 0,
                aR = 2,
                a6 = 8,
                aY = 9,
                aS = 15,
                bn = 8,
                bf = 29,
                ab = 256,
                bj = ab + 1 + bf,
                ay = 30,
                a8 = 19,
                br = 2 * bj + 1,
                bm = 15,
                aE = 3,
                bq = 258,
                a1 = bq + aE + 1,
                af = 32,
                bp = 42,
                aa = 69,
                aK = 73,
                ar = 91,
                aV = 103,
                bk = 113,
                bl = 666,
                ad = 1,
                ag = 2,
                ah = 3,
                ac = 4,
                bs = 3,
                bo = function(f, g, c, d, h) {
                    this.good_length = f, this.max_lazy = g, this.nice_length = c, this.max_chain = d, this.func = h
                };
            bc = [new bo(0, 0, 0, 0, an), new bo(4, 4, 8, 4, aJ), new bo(4, 5, 16, 8, aJ), new bo(4, 6, 32, 32, aJ), new bo(4, 4, 16, 16, aL), new bo(8, 16, 32, 32, aL), new bo(8, 16, 128, 128, aL), new bo(8, 32, 128, 256, aL), new bo(32, 128, 258, 1024, aL), new bo(32, 258, 258, 4096, aL)], aM.deflateInit = ai, aM.deflateInit2 = aj, aM.deflateReset = aA, aM.deflateResetKeep = am, aM.deflateSetHeader = ak, aM.deflate = bh, aM.deflateEnd = aW, aM.deflateInfo = "pako deflate (from Nodeca project)"
        }, {
            "../utils/common": 4,
            "./adler32": 6,
            "./crc32": 8,
            "./messages": 14,
            "./trees": 15
        }],
        10: [function(d, f) {
            function c() {
                this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1
            }
            f.exports = c
        }, {}],
        11: [function(f, g) {
            var c = 30,
                d = 12;
            g.exports = function(K, Z) {
                var R, M, L, Q, U, W, aa, Y, ad, I, ab, ac, X, T, G, P, H, V, F, D, C, N, q, J, O;
                R = K.state, M = K.next_in, J = K.input, L = M + (K.avail_in - 5), Q = K.next_out, O = K.output, U = Q - (Z - K.avail_out), W = Q + (K.avail_out - 257), aa = R.dmax, Y = R.wsize, ad = R.whave, I = R.wnext, ab = R.window, ac = R.hold, X = R.bits, T = R.lencode, G = R.distcode, P = (1 << R.lenbits) - 1, H = (1 << R.distbits) - 1;
                K: do {
                    15 > X && (ac += J[M++] << X, X += 8, ac += J[M++] << X, X += 8), V = T[ac & P];
                    Z: for (;;) {
                        if (F = V >>> 24, ac >>>= F, X -= F, F = V >>> 16 & 255, 0 === F) {
                            O[Q++] = 65535 & V
                        } else {
                            if (!(16 & F)) {
                                if (0 === (64 & F)) {
                                    V = T[(65535 & V) + (ac & (1 << F) - 1)];
                                    continue Z
                                }
                                if (32 & F) {
                                    R.mode = d;
                                    break K
                                }
                                K.msg = "invalid literal/length code", R.mode = c;
                                break K
                            }
                            D = 65535 & V, F &= 15, F && (F > X && (ac += J[M++] << X, X += 8), D += ac & (1 << F) - 1, ac >>>= F, X -= F), 15 > X && (ac += J[M++] << X, X += 8, ac += J[M++] << X, X += 8), V = G[ac & H];
                            c: for (;;) {
                                if (F = V >>> 24, ac >>>= F, X -= F, F = V >>> 16 & 255, !(16 & F)) {
                                    if (0 === (64 & F)) {
                                        V = G[(65535 & V) + (ac & (1 << F) - 1)];
                                        continue c
                                    }
                                    K.msg = "invalid distance code", R.mode = c;
                                    break K
                                }
                                if (C = 65535 & V, F &= 15, F > X && (ac += J[M++] << X, X += 8, F > X && (ac += J[M++] << X, X += 8)), C += ac & (1 << F) - 1, C > aa) {
                                    K.msg = "invalid distance too far back", R.mode = c;
                                    break K
                                }
                                if (ac >>>= F, X -= F, F = Q - U, C > F) {
                                    if (F = C - F, F > ad && R.sane) {
                                        K.msg = "invalid distance too far back", R.mode = c;
                                        break K
                                    }
                                    if (N = 0, q = ab, 0 === I) {
                                        if (N += Y - F, D > F) {
                                            D -= F;
                                            do {
                                                O[Q++] = ab[N++]
                                            } while (--F);
                                            N = Q - C, q = O
                                        }
                                    } else {
                                        if (F > I) {
                                            if (N += Y + I - F, F -= I, D > F) {
                                                D -= F;
                                                do {
                                                    O[Q++] = ab[N++]
                                                } while (--F);
                                                if (N = 0, D > I) {
                                                    F = I, D -= F;
                                                    do {
                                                        O[Q++] = ab[N++]
                                                    } while (--F);
                                                    N = Q - C, q = O
                                                }
                                            }
                                        } else {
                                            if (N += I - F, D > F) {
                                                D -= F;
                                                do {
                                                    O[Q++] = ab[N++]
                                                } while (--F);
                                                N = Q - C, q = O
                                            }
                                        }
                                    }
                                    for (; D > 2;) {
                                        O[Q++] = q[N++], O[Q++] = q[N++], O[Q++] = q[N++], D -= 3
                                    }
                                    D && (O[Q++] = q[N++], D > 1 && (O[Q++] = q[N++]))
                                } else {
                                    N = Q - C;
                                    do {
                                        O[Q++] = O[N++], O[Q++] = O[N++], O[Q++] = O[N++], D -= 3
                                    } while (D > 2);
                                    D && (O[Q++] = O[N++], D > 1 && (O[Q++] = O[N++]))
                                }
                                break
                            }
                        }
                        break
                    }
                } while (L > M && W > Q);
                D = X >> 3, M -= D, X -= D << 3, ac &= (1 << X) - 1, K.next_in = M, K.next_out = Q, K.avail_in = L > M ? 5 + (L - M) : 5 - (M - L), K.avail_out = W > Q ? 257 + (W - Q) : 257 - (Q - W), R.hold = ac, R.bits = X
            }
        }, {}],
        12: [function(al, aE, aJ) {
            function az(c) {
                return (c >>> 24 & 255) + (c >>> 8 & 65280) + ((65280 & c) << 8) + ((255 & c) << 24)
            }

            function at() {
                this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new au.Buf16(320), this.work = new au.Buf16(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0
            }

            function an(c) {
                var d;
                return c && c.state ? (d = c.state, c.total_in = c.total_out = d.total = 0, c.msg = "", d.wrap && (c.adler = 1 & d.wrap), d.mode = ba, d.last = 0, d.havedict = 0, d.dmax = 32768, d.head = null, d.hold = 0, d.bits = 0, d.lencode = d.lendyn = new au.Buf32(ao), d.distcode = d.distdyn = new au.Buf32(aS), d.sane = 1, d.back = -1, bf) : bc
            }

            function am(c) {
                var d;
                return c && c.state ? (d = c.state, d.wsize = 0, d.whave = 0, d.wnext = 0, an(c)) : bc
            }

            function ar(f, g) {
                var c, d;
                return f && f.state ? (d = f.state, 0 > g ? (c = 0, g = -g) : (c = (g >> 4) + 1, 48 > g && (g &= 15)), g && (8 > g || g > 15) ? bc : (null !== d.window && d.wbits !== g && (d.window = null), d.wrap = c, d.wbits = g, am(f))) : bc
            }

            function aw(f, g) {
                var c, d;
                return f ? (d = new at, f.state = d, d.window = null, c = ar(f, g), c !== bf && (f.state = null), c) : bc
            }

            function aA(c) {
                return aw(c, bi)
            }

            function aF(c) {
                if (ac) {
                    var d;
                    for (aI = new au.Buf32(512), aC = new au.Buf32(32), d = 0; 144 > d;) {
                        c.lens[d++] = 8
                    }
                    for (; 256 > d;) {
                        c.lens[d++] = 9
                    }
                    for (; 280 > d;) {
                        c.lens[d++] = 7
                    }
                    for (; 288 > d;) {
                        c.lens[d++] = 8
                    }
                    for (ax(ag, c.lens, 0, 288, aI, 0, c.work, {
                            bits: 9
                        }), d = 0; 32 > d;) {
                        c.lens[d++] = 5
                    }
                    ax(af, c.lens, 0, 32, aC, 0, c.work, {
                        bits: 5
                    }), ac = !1
                }
                c.lencode = aI, c.lenbits = 9, c.distcode = aC, c.distbits = 5
            }

            function aD(f, h, c, d) {
                var k, g = f.state;
                return null === g.window && (g.wsize = 1 << g.wbits, g.wnext = 0, g.whave = 0, g.window = new au.Buf8(g.wsize)), d >= g.wsize ? (au.arraySet(g.window, h, c - g.wsize, g.wsize, 0), g.wnext = 0, g.whave = g.wsize) : (k = g.wsize - g.wnext, k > d && (k = d), au.arraySet(g.window, h, c - d, k, g.wnext), d -= k, d ? (au.arraySet(g.window, h, c - d, d, 0), g.wnext = d, g.whave = g.wsize) : (g.wnext += k, g.wnext === g.wsize && (g.wnext = 0), g.whave < g.wsize && (g.whave += k))), 0
            }

            function aK(z, J) {
                var N, E, C, A, D, G, H, R, y, K, M, I, B, m, L, O, w, Q, d, p, F, f, x, q, k = 0,
                    v = new au.Buf8(4),
                    P = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
                if (!z || !z.state || !z.output || !z.input && 0 !== z.avail_in) {
                    return bc
                }
                N = z.state, N.mode === a7 && (N.mode = aN), D = z.next_out, C = z.output, H = z.avail_out, A = z.next_in, E = z.input, G = z.avail_in, R = N.hold, y = N.bits, K = G, M = H, f = bf;
                z: for (;;) {
                    switch (N.mode) {
                        case ba:
                            if (0 === N.wrap) {
                                N.mode = aN;
                                break
                            }
                            for (; 16 > y;) {
                                if (0 === G) {
                                    break z
                                }
                                G--, R += E[A++] << y, y += 8
                            }
                            if (2 & N.wrap && 35615 === R) {
                                N.check = 0, v[0] = 255 & R, v[1] = R >>> 8 & 255, N.check = aq(N.check, v, 2, 0), R = 0, y = 0, N.mode = a8;
                                break
                            }
                            if (N.flags = 0, N.head && (N.head.done = !1), !(1 & N.wrap) || (((255 & R) << 8) + (R >> 8)) % 31) {
                                z.msg = "incorrect header check", N.mode = bl;
                                break
                            }
                            if ((15 & R) !== aR) {
                                z.msg = "unknown compression method", N.mode = bl;
                                break
                            }
                            if (R >>>= 4, y -= 4, F = (15 & R) + 8, 0 === N.wbits) {
                                N.wbits = F
                            } else {
                                if (F > N.wbits) {
                                    z.msg = "invalid window size", N.mode = bl;
                                    break
                                }
                            }
                            N.dmax = 1 << F, z.adler = N.check = 1, N.mode = 512 & R ? ap : a7, R = 0, y = 0;
                            break;
                        case a8:
                            for (; 16 > y;) {
                                if (0 === G) {
                                    break z
                                }
                                G--, R += E[A++] << y, y += 8
                            }
                            if (N.flags = R, (255 & N.flags) !== aR) {
                                z.msg = "unknown compression method", N.mode = bl;
                                break
                            }
                            if (57344 & N.flags) {
                                z.msg = "unknown header flags set", N.mode = bl;
                                break
                            }
                            N.head && (N.head.text = R >> 8 & 1), 512 & N.flags && (v[0] = 255 & R, v[1] = R >>> 8 & 255, N.check = aq(N.check, v, 2, 0)), R = 0, y = 0, N.mode = a1;
                        case a1:
                            for (; 32 > y;) {
                                if (0 === G) {
                                    break z
                                }
                                G--, R += E[A++] << y, y += 8
                            }
                            N.head && (N.head.time = R), 512 & N.flags && (v[0] = 255 & R, v[1] = R >>> 8 & 255, v[2] = R >>> 16 & 255, v[3] = R >>> 24 & 255, N.check = aq(N.check, v, 4, 0)), R = 0, y = 0, N.mode = aQ;
                        case aQ:
                            for (; 16 > y;) {
                                if (0 === G) {
                                    break z
                                }
                                G--, R += E[A++] << y, y += 8
                            }
                            N.head && (N.head.xflags = 255 & R, N.head.os = R >> 8), 512 & N.flags && (v[0] = 255 & R, v[1] = R >>> 8 & 255, N.check = aq(N.check, v, 2, 0)), R = 0, y = 0, N.mode = a6;
                        case a6:
                            if (1024 & N.flags) {
                                for (; 16 > y;) {
                                    if (0 === G) {
                                        break z
                                    }
                                    G--, R += E[A++] << y, y += 8
                                }
                                N.length = R, N.head && (N.head.extra_len = R), 512 & N.flags && (v[0] = 255 & R, v[1] = R >>> 8 & 255, N.check = aq(N.check, v, 2, 0)), R = 0, y = 0
                            } else {
                                N.head && (N.head.extra = null)
                            }
                            N.mode = ay;
                        case ay:
                            if (1024 & N.flags && (I = N.length, I > G && (I = G), I && (N.head && (F = N.head.extra_len - N.length, N.head.extra || (N.head.extra = new Array(N.head.extra_len)), au.arraySet(N.head.extra, E, A, I, F)), 512 & N.flags && (N.check = aq(N.check, E, I, A)), G -= I, A += I, N.length -= I), N.length)) {
                                break z
                            }
                            N.length = 0, N.mode = a0;
                        case a0:
                            if (2048 & N.flags) {
                                if (0 === G) {
                                    break z
                                }
                                I = 0;
                                do {
                                    F = E[A + I++], N.head && F && N.length < 65536 && (N.head.name += String.fromCharCode(F))
                                } while (F && G > I);
                                if (512 & N.flags && (N.check = aq(N.check, E, I, A)), G -= I, A += I, F) {
                                    break z
                                }
                            } else {
                                N.head && (N.head.name = null)
                            }
                            N.length = 0, N.mode = a2;
                        case a2:
                            if (4096 & N.flags) {
                                if (0 === G) {
                                    break z
                                }
                                I = 0;
                                do {
                                    F = E[A + I++], N.head && F && N.length < 65536 && (N.head.comment += String.fromCharCode(F))
                                } while (F && G > I);
                                if (512 & N.flags && (N.check = aq(N.check, E, I, A)), G -= I, A += I, F) {
                                    break z
                                }
                            } else {
                                N.head && (N.head.comment = null)
                            }
                            N.mode = aW;
                        case aW:
                            if (512 & N.flags) {
                                for (; 16 > y;) {
                                    if (0 === G) {
                                        break z
                                    }
                                    G--, R += E[A++] << y, y += 8
                                }
                                if (R !== (65535 & N.check)) {
                                    z.msg = "header crc mismatch", N.mode = bl;
                                    break
                                }
                                R = 0, y = 0
                            }
                            N.head && (N.head.hcrc = N.flags >> 9 & 1, N.head.done = !0), z.adler = N.check = 0, N.mode = a7;
                            break;
                        case ap:
                            for (; 32 > y;) {
                                if (0 === G) {
                                    break z
                                }
                                G--, R += E[A++] << y, y += 8
                            }
                            z.adler = N.check = az(R), R = 0, y = 0, N.mode = aM;
                        case aM:
                            if (0 === N.havedict) {
                                return z.next_out = D, z.avail_out = H, z.next_in = A, z.avail_in = G, N.hold = R, N.bits = y, aU
                            }
                            z.adler = N.check = 1, N.mode = a7;
                        case a7:
                            if (J === aT || J === a9) {
                                break z
                            }
                        case aN:
                            if (N.last) {
                                R >>>= 7 & y, y -= 7 & y, N.mode = bm;
                                break
                            }
                            for (; 3 > y;) {
                                if (0 === G) {
                                    break z
                                }
                                G--, R += E[A++] << y, y += 8
                            }
                            switch (N.last = 1 & R, R >>>= 1, y -= 1, 3 & R) {
                                case 0:
                                    N.mode = aO;
                                    break;
                                case 1:
                                    if (aF(N), N.mode = ab, J === a9) {
                                        R >>>= 2, y -= 2;
                                        break z
                                    }
                                    break;
                                case 2:
                                    N.mode = aP;
                                    break;
                                case 3:
                                    z.msg = "invalid block type", N.mode = bl
                            }
                            R >>>= 2, y -= 2;
                            break;
                        case aO:
                            for (R >>>= 7 & y, y -= 7 & y; 32 > y;) {
                                if (0 === G) {
                                    break z
                                }
                                G--, R += E[A++] << y, y += 8
                            }
                            if ((65535 & R) !== (R >>> 16 ^ 65535)) {
                                z.msg = "invalid stored block lengths", N.mode = bl;
                                break
                            }
                            if (N.length = 65535 & R, R = 0, y = 0, N.mode = a3, J === a9) {
                                break z
                            }
                        case a3:
                            N.mode = aV;
                        case aV:
                            if (I = N.length) {
                                if (I > G && (I = G), I > H && (I = H), 0 === I) {
                                    break z
                                }
                                au.arraySet(C, E, A, I, D), G -= I, A += I, H -= I, D += I, N.length -= I;
                                break
                            }
                            N.mode = a7;
                            break;
                        case aP:
                            for (; 14 > y;) {
                                if (0 === G) {
                                    break z
                                }
                                G--, R += E[A++] << y, y += 8
                            }
                            if (N.nlen = (31 & R) + 257, R >>>= 5, y -= 5, N.ndist = (31 & R) + 1, R >>>= 5, y -= 5, N.ncode = (15 & R) + 4, R >>>= 4, y -= 4, N.nlen > 286 || N.ndist > 30) {
                                z.msg = "too many length or distance symbols", N.mode = bl;
                                break
                            }
                            N.have = 0, N.mode = bk;
                        case bk:
                            for (; N.have < N.ncode;) {
                                for (; 3 > y;) {
                                    if (0 === G) {
                                        break z
                                    }
                                    G--, R += E[A++] << y, y += 8
                                }
                                N.lens[P[N.have++]] = 7 & R, R >>>= 3, y -= 3
                            }
                            for (; N.have < 19;) {
                                N.lens[P[N.have++]] = 0
                            }
                            if (N.lencode = N.lendyn, N.lenbits = 7, x = {
                                    bits: N.lenbits
                                }, f = ax(ah, N.lens, 0, 19, N.lencode, 0, N.work, x), N.lenbits = x.bits, f) {
                                z.msg = "invalid code lengths set", N.mode = bl;
                                break
                            }
                            N.have = 0, N.mode = bb;
                        case bb:
                            for (; N.have < N.nlen + N.ndist;) {
                                for (; k = N.lencode[R & (1 << N.lenbits) - 1], L = k >>> 24, O = k >>> 16 & 255, w = 65535 & k, !(y >= L);) {
                                    if (0 === G) {
                                        break z
                                    }
                                    G--, R += E[A++] << y, y += 8
                                }
                                if (16 > w) {
                                    R >>>= L, y -= L, N.lens[N.have++] = w
                                } else {
                                    if (16 === w) {
                                        for (q = L + 2; q > y;) {
                                            if (0 === G) {
                                                break z
                                            }
                                            G--, R += E[A++] << y, y += 8
                                        }
                                        if (R >>>= L, y -= L, 0 === N.have) {
                                            z.msg = "invalid bit length repeat", N.mode = bl;
                                            break
                                        }
                                        F = N.lens[N.have - 1], I = 3 + (3 & R), R >>>= 2, y -= 2
                                    } else {
                                        if (17 === w) {
                                            for (q = L + 3; q > y;) {
                                                if (0 === G) {
                                                    break z
                                                }
                                                G--, R += E[A++] << y, y += 8
                                            }
                                            R >>>= L, y -= L, F = 0, I = 3 + (7 & R), R >>>= 3, y -= 3
                                        } else {
                                            for (q = L + 7; q > y;) {
                                                if (0 === G) {
                                                    break z
                                                }
                                                G--, R += E[A++] << y, y += 8
                                            }
                                            R >>>= L, y -= L, F = 0, I = 11 + (127 & R), R >>>= 7, y -= 7
                                        }
                                    }
                                    if (N.have + I > N.nlen + N.ndist) {
                                        z.msg = "invalid bit length repeat", N.mode = bl;
                                        break
                                    }
                                    for (; I--;) {
                                        N.lens[N.have++] = F
                                    }
                                }
                            }
                            if (N.mode === bl) {
                                break
                            }
                            if (0 === N.lens[256]) {
                                z.msg = "invalid code -- missing end-of-block", N.mode = bl;
                                break
                            }
                            if (N.lenbits = 9, x = {
                                    bits: N.lenbits
                                }, f = ax(ag, N.lens, 0, N.nlen, N.lencode, 0, N.work, x), N.lenbits = x.bits, f) {
                                z.msg = "invalid literal/lengths set", N.mode = bl;
                                break
                            }
                            if (N.distbits = 6, N.distcode = N.distdyn, x = {
                                    bits: N.distbits
                                }, f = ax(af, N.lens, N.nlen, N.ndist, N.distcode, 0, N.work, x), N.distbits = x.bits, f) {
                                z.msg = "invalid distances set", N.mode = bl;
                                break
                            }
                            if (N.mode = ab, J === a9) {
                                break z
                            }
                        case ab:
                            N.mode = bg;
                        case bg:
                            if (G >= 6 && H >= 258) {
                                z.next_out = D, z.avail_out = H, z.next_in = A, z.avail_in = G, N.hold = R, N.bits = y, aj(z, M), D = z.next_out, C = z.output, H = z.avail_out, A = z.next_in, E = z.input, G = z.avail_in, R = N.hold, y = N.bits, N.mode === a7 && (N.back = -1);
                                break
                            }
                            for (N.back = 0; k = N.lencode[R & (1 << N.lenbits) - 1], L = k >>> 24, O = k >>> 16 & 255, w = 65535 & k, !(y >= L);) {
                                if (0 === G) {
                                    break z
                                }
                                G--, R += E[A++] << y, y += 8
                            }
                            if (O && 0 === (240 & O)) {
                                for (Q = L, d = O, p = w; k = N.lencode[p + ((R & (1 << Q + d) - 1) >> Q)], L = k >>> 24, O = k >>> 16 & 255, w = 65535 & k, !(y >= Q + L);) {
                                    if (0 === G) {
                                        break z
                                    }
                                    G--, R += E[A++] << y, y += 8
                                }
                                R >>>= Q, y -= Q, N.back += Q
                            }
                            if (R >>>= L, y -= L, N.back += L, N.length = w, 0 === O) {
                                N.mode = aB;
                                break
                            }
                            if (32 & O) {
                                N.back = -1, N.mode = a7;
                                break
                            }
                            if (64 & O) {
                                z.msg = "invalid literal/length code", N.mode = bl;
                                break
                            }
                            N.extra = 15 & O, N.mode = av;
                        case av:
                            if (N.extra) {
                                for (q = N.extra; q > y;) {
                                    if (0 === G) {
                                        break z
                                    }
                                    G--, R += E[A++] << y, y += 8
                                }
                                N.length += R & (1 << N.extra) - 1, R >>>= N.extra, y -= N.extra, N.back += N.extra
                            }
                            N.was = N.length, N.mode = a5;
                        case a5:
                            for (; k = N.distcode[R & (1 << N.distbits) - 1], L = k >>> 24, O = k >>> 16 & 255, w = 65535 & k, !(y >= L);) {
                                if (0 === G) {
                                    break z
                                }
                                G--, R += E[A++] << y, y += 8
                            }
                            if (0 === (240 & O)) {
                                for (Q = L, d = O, p = w; k = N.distcode[p + ((R & (1 << Q + d) - 1) >> Q)], L = k >>> 24, O = k >>> 16 & 255, w = 65535 & k, !(y >= Q + L);) {
                                    if (0 === G) {
                                        break z
                                    }
                                    G--, R += E[A++] << y, y += 8
                                }
                                R >>>= Q, y -= Q, N.back += Q
                            }
                            if (R >>>= L, y -= L, N.back += L, 64 & O) {
                                z.msg = "invalid distance code", N.mode = bl;
                                break
                            }
                            N.offset = w, N.extra = 15 & O, N.mode = bn;
                        case bn:
                            if (N.extra) {
                                for (q = N.extra; q > y;) {
                                    if (0 === G) {
                                        break z
                                    }
                                    G--, R += E[A++] << y, y += 8
                                }
                                N.offset += R & (1 << N.extra) - 1, R >>>= N.extra, y -= N.extra, N.back += N.extra
                            }
                            if (N.offset > N.dmax) {
                                z.msg = "invalid distance too far back", N.mode = bl;
                                break
                            }
                            N.mode = bj;
                        case bj:
                            if (0 === H) {
                                break z
                            }
                            if (I = M - H, N.offset > I) {
                                if (I = N.offset - I, I > N.whave && N.sane) {
                                    z.msg = "invalid distance too far back", N.mode = bl;
                                    break
                                }
                                I > N.wnext ? (I -= N.wnext, B = N.wsize - I) : B = N.wnext - I, I > N.length && (I = N.length), m = N.window
                            } else {
                                m = C, B = D - N.offset, I = N.length
                            }
                            I > H && (I = H), H -= I, N.length -= I;
                            do {
                                C[D++] = m[B++]
                            } while (--I);
                            0 === N.length && (N.mode = bg);
                            break;
                        case aB:
                            if (0 === H) {
                                break z
                            }
                            C[D++] = N.length, H--, N.mode = bg;
                            break;
                        case bm:
                            if (N.wrap) {
                                for (; 32 > y;) {
                                    if (0 === G) {
                                        break z
                                    }
                                    G--, R |= E[A++] << y, y += 8
                                }
                                if (M -= H, z.total_out += M, N.total += M, M && (z.adler = N.check = N.flags ? aq(N.check, C, M, D - M) : ai(N.check, C, M, D - M)), M = H, (N.flags ? R : az(R)) !== N.check) {
                                    z.msg = "incorrect data check", N.mode = bl;
                                    break
                                }
                                R = 0, y = 0
                            }
                            N.mode = aY;
                        case aY:
                            if (N.wrap && N.flags) {
                                for (; 32 > y;) {
                                    if (0 === G) {
                                        break z
                                    }
                                    G--, R += E[A++] << y, y += 8
                                }
                                if (R !== (4294967295 & N.total)) {
                                    z.msg = "incorrect length check", N.mode = bl;
                                    break
                                }
                                R = 0, y = 0
                            }
                            N.mode = ad;
                        case ad:
                            f = aL;
                            break z;
                        case bl:
                            f = a4;
                            break z;
                        case aa:
                            return aZ;
                        case aH:
                        default:
                            return bc
                    }
                }
                return z.next_out = D, z.avail_out = H, z.next_in = A, z.avail_in = G, N.hold = R, N.bits = y, (N.wsize || M !== z.avail_out && N.mode < bl && (N.mode < bm || J !== bd)) && aD(z, z.output, z.next_out, M - z.avail_out) ? (N.mode = aa, aZ) : (K -= z.avail_in, M -= z.avail_out, z.total_in += K, z.total_out += M, N.total += M, N.wrap && M && (z.adler = N.check = N.flags ? aq(N.check, C, M, z.next_out - M) : ai(N.check, C, M, z.next_out - M)), z.data_type = N.bits + (N.last ? 64 : 0) + (N.mode === a7 ? 128 : 0) + (N.mode === ab || N.mode === a3 ? 256 : 0), (0 === K && 0 === M || J === bd) && f === bf && (f = aX), f)
            }

            function ak(c) {
                if (!c || !c.state) {
                    return bc
                }
                var d = c.state;
                return d.window && (d.window = null), c.state = null, bf
            }

            function aG(d, f) {
                var c;
                return d && d.state ? (c = d.state, 0 === (2 & c.wrap) ? bc : (c.head = f, f.done = !1, bf)) : bc
            }
            var aI, aC, au = al("../utils/common"),
                ai = al("./adler32"),
                aq = al("./crc32"),
                aj = al("./inffast"),
                ax = al("./inftrees"),
                ah = 0,
                ag = 1,
                af = 2,
                bd = 4,
                aT = 5,
                a9 = 6,
                bf = 0,
                aL = 1,
                aU = 2,
                bc = -2,
                a4 = -3,
                aZ = -4,
                aX = -5,
                aR = 8,
                ba = 1,
                a8 = 2,
                a1 = 3,
                aQ = 4,
                a6 = 5,
                ay = 6,
                a0 = 7,
                a2 = 8,
                aW = 9,
                ap = 10,
                aM = 11,
                a7 = 12,
                aN = 13,
                aO = 14,
                a3 = 15,
                aV = 16,
                aP = 17,
                bk = 18,
                bb = 19,
                ab = 20,
                bg = 21,
                av = 22,
                a5 = 23,
                bn = 24,
                bj = 25,
                aB = 26,
                bm = 27,
                aY = 28,
                ad = 29,
                bl = 30,
                aa = 31,
                aH = 32,
                ao = 852,
                aS = 592,
                bh = 15,
                bi = bh,
                ac = !0;
            aJ.inflateReset = am, aJ.inflateReset2 = ar, aJ.inflateResetKeep = an, aJ.inflateInit = aA, aJ.inflateInit2 = aw, aJ.inflate = aK, aJ.inflateEnd = ak, aJ.inflateGetHeader = aG, aJ.inflateInfo = "pako inflate (from Nodeca project)"
        }, {
            "../utils/common": 4,
            "./adler32": 6,
            "./crc32": 8,
            "./inffast": 11,
            "./inftrees": 13
        }],
        13: [function(z, v) {
            var x = z("../utils/common"),
                p = 15,
                k = 852,
                c = 592,
                A = 0,
                g = 1,
                m = 2,
                q = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0],
                w = [16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18, 19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78],
                u = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 0, 0],
                y = [16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29, 64, 64];
            v.exports = function(ah, at, af, au, av, ar, ao, ac) {
                var an, ad, ap, aa, X, W, al, l, ag, am = ac.bits,
                    d = 0,
                    o = 0,
                    aj = 0,
                    Y = 0,
                    G = 0,
                    s = 0,
                    h = 0,
                    ai = 0,
                    ae = 0,
                    Q = 0,
                    f = null,
                    ab = 0,
                    aq = new x.Buf16(p + 1),
                    J = new x.Buf16(p + 1),
                    V = null,
                    r = 0;
                for (d = 0; p >= d; d++) {
                    aq[d] = 0
                }
                for (o = 0; au > o; o++) {
                    aq[at[af + o]]++
                }
                for (G = am, Y = p; Y >= 1 && 0 === aq[Y]; Y--) {}
                if (G > Y && (G = Y), 0 === Y) {
                    return av[ar++] = 20971520, av[ar++] = 20971520, ac.bits = 1, 0
                }
                for (aj = 1; Y > aj && 0 === aq[aj]; aj++) {}
                for (aj > G && (G = aj), ai = 1, d = 1; p >= d; d++) {
                    if (ai <<= 1, ai -= aq[d], 0 > ai) {
                        return -1
                    }
                }
                if (ai > 0 && (ah === A || 1 !== Y)) {
                    return -1
                }
                for (J[1] = 0, d = 1; p > d; d++) {
                    J[d + 1] = J[d] + aq[d]
                }
                for (o = 0; au > o; o++) {
                    0 !== at[af + o] && (ao[J[at[af + o]]++] = o)
                }
                if (ah === A ? (f = V = ao, W = 19) : ah === g ? (f = q, ab -= 257, V = w, r -= 257, W = 256) : (f = u, V = y, W = -1), Q = 0, o = 0, d = aj, X = ar, s = G, h = 0, ap = -1, ae = 1 << G, aa = ae - 1, ah === g && ae > k || ah === m && ae > c) {
                    return 1
                }
                for (var ak = 0;;) {
                    ak++, al = d - h, ao[o] < W ? (l = 0, ag = ao[o]) : ao[o] > W ? (l = V[r + ao[o]], ag = f[ab + ao[o]]) : (l = 96, ag = 0), an = 1 << d - h, ad = 1 << s, aj = ad;
                    do {
                        ad -= an, av[X + (Q >> h) + ad] = al << 24 | l << 16 | ag | 0
                    } while (0 !== ad);
                    for (an = 1 << d - 1; Q & an;) {
                        an >>= 1
                    }
                    if (0 !== an ? (Q &= an - 1, Q += an) : Q = 0, o++, 0 === --aq[d]) {
                        if (d === Y) {
                            break
                        }
                        d = at[af + ao[o]]
                    }
                    if (d > G && (Q & aa) !== ap) {
                        for (0 === h && (h = G), X += aj, s = d - h, ai = 1 << s; Y > s + h && (ai -= aq[s + h], !(0 >= ai));) {
                            s++, ai <<= 1
                        }
                        if (ae += 1 << s, ah === g && ae > k || ah === m && ae > c) {
                            return 1
                        }
                        ap = Q & aa, av[ap] = G << 24 | s << 16 | X - ar | 0
                    }
                }
                return 0 !== Q && (av[X + Q] = d - h << 24 | 64 << 16 | 0), ac.bits = G, 0
            }
        }, {
            "../utils/common": 4
        }],
        14: [function(c, d) {
            d.exports = {
                2: "need dictionary",
                1: "stream end",
                0: "",
                "-1": "file error",
                "-2": "stream error",
                "-3": "data error",
                "-4": "insufficient memory",
                "-5": "buffer error",
                "-6": "incompatible version"
            }
        }, {}],
        15: [function(aV, bb, bi) {
            function a6(c) {
                for (var d = c.length; --d >= 0;) {
                    c[d] = 0
                }
            }

            function a1(c) {
                return 256 > c ? aG[c] : aG[256 + (c >>> 7)]
            }

            function aX(c, d) {
                c.pending_buf[c.pending++] = 255 & d, c.pending_buf[c.pending++] = d >>> 8 & 255
            }

            function aW(d, f, c) {
                d.bi_valid > ax - c ? (d.bi_buf |= f << d.bi_valid & 65535, aX(d, d.bi_buf), d.bi_buf = f >> ax - d.bi_valid, d.bi_valid += c - ax) : (d.bi_buf |= f << d.bi_valid & 65535, d.bi_valid += c)
            }

            function a0(d, f, c) {
                aW(d, c[2 * f], c[2 * f + 1])
            }

            function a3(d, f) {
                var c = 0;
                do {
                    c |= 1 & d, d >>>= 1, c <<= 1
                } while (--f > 0);
                return c >>> 1
            }

            function a7(c) {
                16 === c.bi_valid ? (aX(c, c.bi_buf), c.bi_buf = 0, c.bi_valid = 0) : c.bi_valid >= 8 && (c.pending_buf[c.pending++] = 255 & c.bi_buf, c.bi_buf >>= 8, c.bi_valid -= 8)
            }

            function bc(E, x) {
                var B, q, m, g, F, k, p = x.dyn_tree,
                    v = x.max_code,
                    y = x.stat_desc.static_tree,
                    w = x.stat_desc.has_stree,
                    C = x.stat_desc.extra_bits,
                    D = x.stat_desc.extra_base,
                    z = x.stat_desc.max_length,
                    A = 0;
                for (g = 0; ac >= g; g++) {
                    E.bl_count[g] = 0
                }
                for (p[2 * E.heap[E.heap_max] + 1] = 0, B = E.heap_max + 1; aY > B; B++) {
                    q = E.heap[B], g = p[2 * p[2 * q + 1] + 1] + 1, g > z && (g = z, A++), p[2 * q + 1] = g, q > v || (E.bl_count[g]++, F = 0, q >= D && (F = C[q - D]), k = p[2 * q], E.opt_len += k * (g + F), w && (E.static_len += k * (y[2 * q + 1] + F)))
                }
                if (0 !== A) {
                    do {
                        for (g = z - 1; 0 === E.bl_count[g];) {
                            g--
                        }
                        E.bl_count[g]--, E.bl_count[g + 1] += 2, E.bl_count[z]--, A -= 2
                    } while (A > 0);
                    for (g = z; 0 !== g; g--) {
                        for (q = E.bl_count[g]; 0 !== q;) {
                            m = E.heap[--B], m > v || (p[2 * m + 1] !== g && (E.opt_len += (g - p[2 * m + 1]) * p[2 * m], p[2 * m + 1] = g), q--)
                        }
                    }
                }
            }

            function a9(f, k, c) {
                var d, m, h = new Array(ac + 1),
                    g = 0;
                for (d = 1; ac >= d; d++) {
                    h[d] = g = g + c[d - 1] << 1
                }
                for (m = 0; k >= m; m++) {
                    var l = f[2 * m + 1];
                    0 !== l && (f[2 * m] = a3(h[l]++, l))
                }
            }

            function bk() {
                var f, h, c, d, k, g = new Array(ac + 1);
                for (c = 0, d = 0; aw - 1 > d; d++) {
                    for (aL[d] = c, f = 0; f < 1 << aH[d]; f++) {
                        aM[c++] = d
                    }
                }
                for (aM[c - 1] = d, k = 0, d = 0; 16 > d; d++) {
                    for (bj[d] = k, f = 0; f < 1 << af[d]; f++) {
                        aG[k++] = d
                    }
                }
                for (k >>= 7; at > d; d++) {
                    for (bj[d] = k << 7, f = 0; f < 1 << af[d] - 7; f++) {
                        aG[256 + k++] = d
                    }
                }
                for (h = 0; ac >= h; h++) {
                    g[h] = 0
                }
                for (f = 0; 143 >= f;) {
                    aa[2 * f + 1] = 8, f++, g[8]++
                }
                for (; 255 >= f;) {
                    aa[2 * f + 1] = 9, f++, g[9]++
                }
                for (; 279 >= f;) {
                    aa[2 * f + 1] = 7, f++, g[7]++
                }
                for (; 287 >= f;) {
                    aa[2 * f + 1] = 8, f++, g[8]++
                }
                for (a9(aa, aq + 1, g), f = 0; at > f; f++) {
                    aP[2 * f + 1] = 5, aP[2 * f] = a3(f, 5)
                }
                aD = new aS(aa, aH, a5 + 1, aq, ac), aJ = new aS(aP, af, 0, at, ac), ba = new aS(new Array(0), bh, 0, an, ad)
            }

            function aU(c) {
                var d;
                for (d = 0; aq > d; d++) {
                    c.dyn_ltree[2 * d] = 0
                }
                for (d = 0; at > d; d++) {
                    c.dyn_dtree[2 * d] = 0
                }
                for (d = 0; an > d; d++) {
                    c.bl_tree[2 * d] = 0
                }
                c.dyn_ltree[2 * ag] = 1, c.opt_len = c.static_len = 0, c.last_lit = c.matches = 0
            }

            function bf(c) {
                c.bi_valid > 8 ? aX(c, c.bi_buf) : c.bi_valid > 0 && (c.pending_buf[c.pending++] = c.bi_buf), c.bi_buf = 0, c.bi_valid = 0
            }

            function bg(f, g, c, d) {
                bf(f), d && (aX(f, c), aX(f, ~c)), al.arraySet(f.pending_buf, f.window, g, c, f.pending), f.pending += c
            }

            function a8(f, h, c, d) {
                var k = 2 * h,
                    g = 2 * c;
                return f[k] < f[g] || f[k] === f[g] && d[h] <= d[c]
            }

            function a2(f, g, c) {
                for (var d = f.heap[c], h = c << 1; h <= f.heap_len && (h < f.heap_len && a8(g, f.heap[h + 1], f.heap[h], f.depth) && h++, !a8(g, d, f.heap[h], f.depth));) {
                    f.heap[c] = f.heap[h], c = h, h <<= 1
                }
                f.heap[c] = d
            }

            function aR(k, p, f) {
                var g, o, c, m, q = 0;
                if (0 !== k.last_lit) {
                    do {
                        g = k.pending_buf[k.d_buf + 2 * q] << 8 | k.pending_buf[k.d_buf + 2 * q + 1], o = k.pending_buf[k.l_buf + q], q++, 0 === g ? a0(k, o, p) : (c = aM[o], a0(k, c + a5 + 1, p), m = aH[c], 0 !== m && (o -= aL[c], aW(k, o, m)), g--, c = a1(g), a0(k, c, f), m = af[c], 0 !== m && (g -= bj[c], aW(k, g, m)))
                    } while (q < k.last_lit)
                }
                a0(k, ag, p)
            }

            function aZ(u, p) {
                var q, k, f, c = p.dyn_tree,
                    v = p.stat_desc.static_tree,
                    d = p.stat_desc.has_stree,
                    g = p.stat_desc.elems,
                    m = -1;
                for (u.heap_len = 0, u.heap_max = aY, q = 0; g > q; q++) {
                    0 !== c[2 * q] ? (u.heap[++u.heap_len] = m = q, u.depth[q] = 0) : c[2 * q + 1] = 0
                }
                for (; u.heap_len < 2;) {
                    f = u.heap[++u.heap_len] = 2 > m ? ++m : 0, c[2 * f] = 1, u.depth[f] = 0, u.opt_len--, d && (u.static_len -= v[2 * f + 1])
                }
                for (p.max_code = m, q = u.heap_len >> 1; q >= 1; q--) {
                    a2(u, c, q)
                }
                f = g;
                do {
                    q = u.heap[1], u.heap[1] = u.heap[u.heap_len--], a2(u, c, 1), k = u.heap[1], u.heap[--u.heap_max] = q, u.heap[--u.heap_max] = k, c[2 * f] = c[2 * q] + c[2 * k], u.depth[f] = (u.depth[q] >= u.depth[k] ? u.depth[q] : u.depth[k]) + 1, c[2 * q + 1] = c[2 * k + 1] = f, u.heap[1] = f++, a2(u, c, 1)
                } while (u.heap_len >= 2);
                u.heap[--u.heap_max] = u.heap[1], bc(u, p), a9(c, m, u.bl_count)
            }

            function aT(u, p, q) {
                var k, f, c = -1,
                    v = p[1],
                    d = 0,
                    g = 7,
                    m = 4;
                for (0 === v && (g = 138, m = 3), p[2 * (q + 1) + 1] = 65535, k = 0; q >= k; k++) {
                    f = v, v = p[2 * (k + 1) + 1], ++d < g && f === v || (m > d ? u.bl_tree[2 * f] += d : 0 !== f ? (f !== c && u.bl_tree[2 * f]++, u.bl_tree[2 * au]++) : 10 >= d ? u.bl_tree[2 * am]++ : u.bl_tree[2 * ah]++, d = 0, c = f, 0 === v ? (g = 138, m = 3) : f === v ? (g = 6, m = 3) : (g = 7, m = 4))
                }
            }

            function a4(v, q, u) {
                var m, g, c = -1,
                    k = q[1],
                    o = 0,
                    s = 7,
                    p = 4;
                for (0 === k && (s = 138, p = 3), m = 0; u >= m; m++) {
                    if (g = k, k = q[2 * (m + 1) + 1], !(++o < s && g === k)) {
                        if (p > o) {
                            do {
                                a0(v, g, v.bl_tree)
                            } while (0 !== --o)
                        } else {
                            0 !== g ? (g !== c && (a0(v, g, v.bl_tree), o--), a0(v, au, v.bl_tree), aW(v, o - 3, 2)) : 10 >= o ? (a0(v, am, v.bl_tree), aW(v, o - 3, 3)) : (a0(v, ah, v.bl_tree), aW(v, o - 11, 7))
                        }
                        o = 0, c = g, 0 === k ? (s = 138, p = 3) : g === k ? (s = 6, p = 3) : (s = 7, p = 4)
                    }
                }
            }

            function aQ(c) {
                var d;
                for (aT(c, c.dyn_ltree, c.l_desc.max_code), aT(c, c.dyn_dtree, c.d_desc.max_code), aZ(c, c.bl_desc), d = an - 1; d >= 3 && 0 === c.bl_tree[2 * aA[d] + 1]; d--) {}
                return c.opt_len += 3 * (d + 1) + 5 + 5 + 4, d
            }

            function aO(f, g, c, d) {
                var h;
                for (aW(f, g - 257, 5), aW(f, c - 1, 5), aW(f, d - 4, 4), h = 0; d > h; h++) {
                    aW(f, f.bl_tree[2 * aA[h] + 1], 3)
                }
                a4(f, f.dyn_ltree, g - 1), a4(f, f.dyn_dtree, c - 1)
            }

            function aN(d) {
                var f, c = 4093624447;
                for (f = 0; 31 >= f; f++, c >>>= 1) {
                    if (1 & c && 0 !== d.dyn_ltree[2 * f]) {
                        return av
                    }
                }
                if (0 !== d.dyn_ltree[18] || 0 !== d.dyn_ltree[20] || 0 !== d.dyn_ltree[26]) {
                    return ap
                }
                for (f = 32; a5 > f; f++) {
                    if (0 !== d.dyn_ltree[2 * f]) {
                        return ap
                    }
                }
                return av
            }

            function aE(c) {
                bd || (bk(), bd = !0), c.l_desc = new aI(c.dyn_ltree, aD), c.d_desc = new aI(c.dyn_dtree, aJ), c.bl_desc = new aI(c.bl_tree, ba), c.bi_buf = 0, c.bi_valid = 0, aU(c)
            }

            function ak(f, g, c, d) {
                aW(f, (aj << 1) + (d ? 1 : 0), 3), bg(f, g, c, !0)
            }

            function az(c) {
                aW(c, aB << 1, 3), a0(c, ag, aa), a7(c)
            }

            function aF(f, h, c, d) {
                var l, g, k = 0;
                f.level > 0 ? (f.strm.data_type === ao && (f.strm.data_type = aN(f)), aZ(f, f.l_desc), aZ(f, f.d_desc), k = aQ(f), l = f.opt_len + 3 + 7 >>> 3, g = f.static_len + 3 + 7 >>> 3, l >= g && (l = g)) : l = g = c + 5, l >= c + 4 && -1 !== h ? ak(f, h, c, d) : f.strategy === aC || g === l ? (aW(f, (aB << 1) + (d ? 1 : 0), 3), aR(f, aa, aP)) : (aW(f, (ay << 1) + (d ? 1 : 0), 3), aO(f, f.l_desc.max_code + 1, f.d_desc.max_code + 1, k + 1), aR(f, f.dyn_ltree, f.dyn_dtree)), aU(f), d && bf(f)
            }

            function ab(d, f, c) {
                return d.pending_buf[d.d_buf + 2 * d.last_lit] = f >>> 8 & 255, d.pending_buf[d.d_buf + 2 * d.last_lit + 1] = 255 & f, d.pending_buf[d.l_buf + d.last_lit] = 255 & c, d.last_lit++, 0 === f ? d.dyn_ltree[2 * c]++ : (d.matches++, f--, d.dyn_ltree[2 * (aM[c] + a5 + 1)]++, d.dyn_dtree[2 * a1(f)]++), d.last_lit === d.lit_bufsize - 1
            }
            var al = aV("../utils/common"),
                aC = 4,
                av = 0,
                ap = 1,
                ao = 2,
                aj = 0,
                aB = 1,
                ay = 2,
                ar = 3,
                ai = 258,
                aw = 29,
                a5 = 256,
                aq = a5 + 1 + aw,
                at = 30,
                an = 19,
                aY = 2 * aq + 1,
                ac = 15,
                ax = 16,
                ad = 7,
                ag = 256,
                au = 16,
                am = 17,
                ah = 18,
                aH = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0],
                af = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13],
                bh = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7],
                aA = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15],
                aK = 512,
                aa = new Array(2 * (aq + 2));
            a6(aa);
            var aP = new Array(2 * at);
            a6(aP);
            var aG = new Array(aK);
            a6(aG);
            var aM = new Array(ai - ar + 1);
            a6(aM);
            var aL = new Array(aw);
            a6(aL);
            var bj = new Array(at);
            a6(bj);
            var aD, aJ, ba, aS = function(f, g, c, d, h) {
                    this.static_tree = f, this.extra_bits = g, this.extra_base = c, this.elems = d, this.max_length = h, this.has_stree = f && f.length
                },
                aI = function(c, d) {
                    this.dyn_tree = c, this.max_code = 0, this.stat_desc = d
                },
                bd = !1;
            bi._tr_init = aE, bi._tr_stored_block = ak, bi._tr_flush_block = aF, bi._tr_tally = ab, bi._tr_align = az
        }, {
            "../utils/common": 4
        }],
        16: [function(d, f) {
            function c() {
                this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0
            }
            f.exports = c
        }, {}]
    }, {}, [1])(1)
});

function loadScript(a, c) {
    let head = document.getElementsByTagName("head")[0];
    let script = document.createElement("script");
    script.src = a;
    script.type = "text/javascript";
    if (c != null && typeof c !== "undefined") {
        script.onload = c;
        script.onreadystatechange = function() {
            if (this.readyState == "complete") {
                if (c != undefined) {
                    c()
                }
            }
        }
    }
    head.appendChild(script)
}

function loadAllJScripFiles() {
    if (typeof isSingleLib === "undefined") {
        loadScript("../../lib/util.js", null);
        loadScript("../../lib/constants.js", function() {});
        loadScript("../../lib/pako.js", null)
    }
}
loadAllJScripFiles();
var hsiSocket = null;
var reqData;
var hsiWs = null;
var HSIWebSocket = (function() {
    function a(c) {
        hsiSocket = this;
        hsiSocket.OPEN = 0;
        hsiSocket.readyState = 0;
        this.url = c;
        startHsiServer(this.url);
        this.send = function(d) {
            let reqJson = JSON.parse(d);
            HSIDebug(reqJson);
            let type = reqJson.type;
            let req = null;
            if (type === ReqTypeValues.CONNECTION) {
                if (reqJson[Keys.AUTORIZATION] !== undefined && reqJson[Keys.SID] !== undefined && reqJson[Keys.SOURCE] !== undefined) {
                    req = {
                        type: "cn",
                        Authorization: reqJson[Keys.AUTORIZATION],
                        Sid: reqJson[Keys.SID],
                        src: reqJson[Keys.SOURCE]
                    };
                    reqData = req
                } else {
                    if (reqJson[Keys.X_ACCESS_TOKEN] !== undefined && reqJson[Keys.SOURCE] !== undefined) {
                        req = {
                            type: "cn",
                            "x-access-token": reqJson[Keys.X_ACCESS_TOKEN],
                            src: reqJson[Keys.SOURCE]
                        };
                        reqData = req
                    } else {
                        console.error("Invalid connection mode !")
                    }
                }
            } else {
                if (type === ReqTypeValues.FORCE_CONNECTION) {
                    reqData = reqData.type = "fcn";
                    req = reqData
                } else {
                    if (type === ReqTypeValues.LOG) {
                        enableHsiLog(reqJson.enable)
                    } else {
                        console.error("Invalid Request !")
                    }
                }
            }
            if (hsiWs && req) {
                hsiWs.send(JSON.stringify(req))
            } else {
                console.error("Unable to send request !, Reason: Connection faulty or request not valid !")
            }
        };
        this.close = function() {
            hsiWs.close();
            hsiSocket.OPEN = 0;
            hsiSocket.readyState = 0;
            hsiWs = null
        }
    }
    return a
}());

function startHsiServer(a) {
    if (("WebSocket" in window)) {
        hsiWs = new WebSocket(a)
    } else {
        if (("MozWebSocket" in window)) {
            hsiWs = new MozWebSocket(a)
        } else {
            HSIDebug("WebSocket not supported!")
        }
    }
    if (hsiWs) {
        hsiWs.binaryType = "blob"
    } else {
        HSIDebug("WebSocket not initialized!")
    }
    hsiWs.onopen = function() {
        console.log("open");
        hsiSocket.OPEN = 1;
        hsiSocket.readyState = 1;
        hsiSocket.onopen()
    };
    hsiWs.onmessage = function(c) {
        console.log(c);
        let data = c.data;
        HSIDebug(data);
        if (data) {
            hsiSocket.onmessage(data)
        }
    };
    hsiWs.onclose = function() {
        hsiSocket.onclose()
    };
    hsiWs.onerror = function() {
        hsiSocket.OPEN = 0;
        hsiSocket.readyState = 0;
        hsiSocket.onerror()
    }
};