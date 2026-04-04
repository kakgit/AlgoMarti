const axios = require("axios");

const gTelegramBotToken = process.env.TELEGRAM_BOT_TOKEN || "";
const gTelegramChatId = process.env.TELEGRAM_CHAT_ID || "";

exports.defaultRoute = (req, res) => {
    res.render("DeltaFutScprLive.ejs");
};

exports.fnSendTelegramAlertMsg = async (req, res) => {
    try{
        const vMsg = String(req?.body?.Message || "").trim();
        if(!vMsg){
            res.send({ status: "warning", message: "Telegram message is empty.", data: "" });
            return;
        }
        const objTgCfg = fnGetTelegramConfigFromReq(req);
        const bSent = await fnSendTelegramAlert(vMsg, objTgCfg);
        if(bSent){
            res.send({ status: "success", message: "Telegram alert sent.", data: "" });
        }
        else{
            res.send({ status: "warning", message: "Telegram config missing or send failed.", data: "" });
        }
    }
    catch(objErr){
        res.send({ status: "danger", message: "Telegram alert failed.", data: objErr?.message || objErr });
    }
};

const fnSendTelegramAlert = async (pText, pCfg) => {
    try{
        const vBotToken = (pCfg?.botToken || gTelegramBotToken || "").trim();
        const vChatId = (pCfg?.chatId || gTelegramChatId || "").trim();
        if(!vBotToken || !vChatId){
            return false;
        }
        const vText = String(pText || "").trim();
        if(!vText){
            return false;
        }
        await axios.post(`https://api.telegram.org/bot${vBotToken}/sendMessage`, {
            chat_id: vChatId,
            text: vText
        }, { timeout: 5000 });
        return true;
    }
    catch(_objErr){
        return false;
    }
};

const fnGetTelegramConfigFromReq = (req) => {
    return {
        botToken: String(req?.body?.TelegramBotToken || "").trim(),
        chatId: String(req?.body?.TelegramChatId || "").trim()
    };
};
