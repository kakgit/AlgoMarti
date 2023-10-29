const express = require('express');
const route = express.Router();

const homeServices = require('../services/homePage.js');
const samcoServices = require('../services/samcoPage.js');
const tvMsgsServices = require('../services/tvMsgsPage.js');
const tvMsgsController = require('../controller/controllerTvMsgs.js');
const usersController = require('../controller/controllerUsers.js');

//home Routes
route.get("/", homeServices.defaultRoute);

//Samco Routes
route.get("/samco", samcoServices.defaultRoute);

//manageMsgsTV Routes
//API
route.post('/api/tvMsgs', tvMsgsServices.addNewMsg);

route.get("/manageMsgsTV", tvMsgsServices.defaultRoute);
//route.delete('/deleteMsgsTV/:id', tvMsgsController.fnDeleteTvMsgs);
route.get('/api/tvMsgs', tvMsgsController.fnGetAllTvMsgs);
route.post('/api/tvMsgs/:id', tvMsgsController.fnDelTvMsgById);

route.get('/mngUsers', usersController.fnUsersDefault);
route.post('/api/actionUsers', usersController.fnActions);

route.get('*', (req, res) => {
    res.status(404).send({"message": "No Page to Display"});
});
route.post('*', (req, res) => {
    res.status(404).send({"message": "No Page to Display"});
});


module.exports = route;