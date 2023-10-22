const axios = require("axios");


exports.defaultRoute = (req, res) => {
    //res.send("Crud Application");
    res.render("samco.ejs");

    //Make a get request to /api/users
    // axios.get(process.env.API_PATH + 'api/users')
    // .then(function(response){
    //     //console.log(response);
    //     res.render("index.ejs", { users : response.data});
    // })
    // .catch(error => {
    //     res.send(error);
    // })
}
