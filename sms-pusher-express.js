var express = require('express');
var app = express();
var $ = require('jquery');
var http = require('http');
var request = require('request');

const base_url = "http://178.79.144.205:8896/nvdcp/";
const login_url = 'dhis-web-commons-security/login.action?authOnly=true';
const USER_NOT_FOUND = "User Not Found";
const username = "admin";
const password = "district";
const auth = "Basic " + new Buffer(username + ":" + password).toString("base64");
const DE_AGE_GROUP = "IwrXQg06dsL";
const DE_GENDER = "uJnggPmzENW";
const CC_MALE = "bD0nY0GV7yb"
const CC_FEMALE = "CcS0L70SxCF";
const DE_SIDE_EFFECTS = "Ivdr4XGD1Sk";
const CC_DEFAULT = "HllvX50cXC0"
const CC_FiveToFourteen = "L6PjrR9ReFu";
const CC_TwoToFour = "MsA6J2Lo5Z4";
const CC_FourteenPlus = "twpAg0rB6XH";


app.get('/pushSMS', function (req, res) {
    console.log(req.query)

    processSMS(req.query);
   res.send('Hello World');
})

var server = app.listen(8000, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)

})


function authenticate(){

var request = require('request'),
    username = "admin",
    password = "district",
    url = base_url + login_url,
    auth = "Basic " + new Buffer(username + ":" + password).toString("base64");

request(
    {
        url : url,
        headers : {
            "Authorization" : auth
        }
    },
    function (error, response, body) {
        // Do more stuff with 'body' here
    }
)

}

//authenticate();

function processSMS(data){

//var def = $.Deferred;
var message = data.message;
var sender = data.sender;

 
    if (!message){
	// error handling
    }

    var dataJson = parseMessage(message);
//    if (typeof dataJson JSON)

    prepareDataAndSendToDHIS(dataJson,sender);

}

function parseMessage(message){

    var result = {
	sideEffect : undefined,
	 twoToFour: undefined,
	fiveToFourteen : undefined,
	fifteenPlus : undefined,
	males:undefined,
	females : undefined
    }
    var msg_parts = message.split(" ");

    for (var i=1;i<4;i++){
	var msg = msg_parts[i].split(".");
	 switch(msg.length){
	
	    case 1 : // is Side Effect
	               result.sideEffect = msg[0];
	               break;
	    
	    case 2 : // is gender data
	            result.males = msg[0];
	            result.females = msg[1];
	             break;

	    case 3 : //is age group wise data
	             result.twoToFour = msg[0];
	             result.fiveToFourteen =  msg[1];
	             result.fifteenPlus = msg[2];
	              break;
	    
	    default : //invalid format
	 }
    }

    //console.log(result);
return result;
}

function prepareDataAndSendToDHIS(data,sender){

    getUserByPhone(sender).then(function(user){
        if (user == USER_NOT_FOUND){

        }else{
            pushToDataValue(data,sender,user);
        }
    });


}

function getUserByPhone(sender){
    var Q = require('q');

    var def = Q.defer();
        var url = '/api/users?fields=name,id,phoneNumber,organisationUnits&filter=phoneNumber:eq:' + sender;

        var request = require('request'),
            username = "admin",
            password = "district",
            url = base_url + url,
            auth = "Basic " + new Buffer(username + ":" + password).toString("base64");

        request(
            {
                url: url,
                contentType : "json",
                headers: {
                    "Authorization": auth
                }
            },
            function (error, response, body) {
                if (error == null) {
                    body = JSON.parse(body);
                    if(body.users.length == 0){
                        def.resolve(USER_NOT_FOUND);
                    }else{
                        def.resolve(body.users);
                    }
                }else{
                    def.resolve("request exception",error);

                }
                // Do more stuff with 'body' here
            })

    return def.promise;
}

function pushToDataValue(data,sender,user){

    var moment = require("moment");

    var orgUnit = user[0].organisationUnits[0].id;
    var period = moment().format("YYYYMMDD");
    var storedBy = user[0].name;

    var dv = {"dataValues":[]}

    dv.dataValues.push(makeDVJson(DE_GENDER,CC_MALE,period,orgUnit,data["males"],storedBy));
    dv.dataValues.push(makeDVJson(DE_GENDER,CC_FEMALE,period,orgUnit,data["females"],storedBy));
    dv.dataValues.push(makeDVJson(DE_AGE_GROUP,CC_TwoToFour,period,orgUnit,data["twoToFour"],storedBy));
    dv.dataValues.push(makeDVJson(DE_AGE_GROUP,CC_FiveToFourteen,period,orgUnit,data["fiveToFourteen"],storedBy));
    dv.dataValues.push(makeDVJson(DE_AGE_GROUP,CC_FourteenPlus,period,orgUnit,data["fourteenPlus"],storedBy));
    dv.dataValues.push(makeDVJson(DE_SIDE_EFFECTS,CC_DEFAULT,period,orgUnit,data["sideEffect"],storedBy));

    request({
        url: base_url + "/api/dataValueSets?",
        method: "POST",
        json: true,   // <--Very important!!!
        body: dv,
        headers : {
            "Authorization" : auth,
            "Content-Type":"application/json",

}
    }, function (error, response, body){
        console.log(response);debugger
    });




}

function makeDVJson(de,cc,pe,ou,val,storedBy){
    var dv = {"dataElement":de,
        "period":pe,
        "orgUnit":ou,
        "categoryOptionCombo":cc,
        "value":val,
        "storedBy":storedBy
    }
    return dv;
}