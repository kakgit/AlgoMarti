const mdlJsons = require('../model/mdlJsons.js');
const fs = require('fs');

exports.fnUpdJsons = async (req, res) => {

    let vJsonName = req.body.jsonName;
    let vJsonStr = req.body.JsonStr;
    let vJsonFileName = req.body.JsonFileName;
    let vMsg = "";

    //console.log("Recs: " + vJsonStr);

    try {
        if(vJsonName === "")
        {
            res.send({"status": "warning", "message" : "Please use a JSON Name to Update the JSON Data!", "data" : vMsg});
        }
        else
        {
            let vMsg = await mdlJsons.find({"jsonName" : vJsonName});

            // console.log("Recs: " + vMsg);

            if(vMsg.length === 0)
            {
                await mdlJsons.insertMany({"jsonName" : vJsonName, "jsonStr" : vJsonStr});
            }
            else
            {
                await mdlJsons.findOneAndUpdate({jsonName : vJsonName}, {jsonStr : vJsonStr});
                //console.log("Updated");
            }
            //fs.writeFile('myjsonfile.json', vJsonStr, 'utf8', callback);
            fs.writeFile("./public/json/" + vJsonFileName, JSON.stringify(vJsonStr, null, 4), (err) => {
                if (err) {
                    console.error(err);
                    return;
                };
                console.log("File Created / Updated!");
            });
            res.send({"status": "success", "message" : "Json Data Updated Successfully!", "data" : vMsg});
        }
    } catch (error) {
        //console.log(error);
        res.send({"status": "danger", "message" : error});
    }
}