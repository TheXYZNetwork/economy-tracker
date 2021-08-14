const node_echarts = require("node-echarts");
const mysql = require("mysql");
const { Webhook } = require("discord-webhook-node");
const fs = require("fs");
const config = require("./config.json");
const con = mysql.createConnection(config.db);
con.connect(function(err) {
  if (err) throw err;
  con.query(`SELECT * FROM policerp_1.economy_stats WHERE \`date\` >= DATE(NOW()) + INTERVAL -${config.fetchDays+1} DAY AND \`date\` < DATE(NOW()) + INTERVAL 0 DAY;`, function (err, results) {
    if (err) throw err;
    var dates = [];
    var ecoData = [];
    var tmpData = [];

    results.forEach(function(result, i){
      var actualDate = result.date.toLocaleDateString(config.localeDate); // Yes, this is needed.
      tmpData.push(result.circulating);
      if (i > 0) {
        ecoData.push(tmpData[i] - tmpData[i-1])
        dates.push(actualDate); // Dates array is for xAxis TODO: Make ecoData an Object, use key as date with value as circulating :)
      }
    });

    const gConfig = {
    	title: {
    		text: `PoliceRP Money Supply`,
    		subtext: `Last ${config.fetchDays} days (as of ${new Date().toLocaleDateString(config.localeDate).replace(/\//g, "-")})`
    	},
    	xAxis: {
    		type: "category",
    		data: dates
    	},
    	yAxis: {
    		type: "value",
    	},
    	series: [
    	{
    		name: "Difference",
    		type: "bar",
    		data: ecoData
    	}
    	]
    };

    const path = `${__dirname}/charts/${new Date().toLocaleDateString(config.localeDate).replace(/\//g, "-")}.png`;

    node_echarts({
        width: 1000, // Image width, type is number.
        height: 600, // Image height, type is number.
        option: gConfig, // Echarts configuration, type is Object.
        path: path, // Path is filepath of the image which will be created.
        enableAutoDispose: true  //Enable auto-dispose echarts after the image is created.
    })

    if (config.webhook.enabled) {
      const hook = new Webhook(config.webhook.url);
      hook.setUsername(config.webhook.name);
      hook.sendFile(path);
    }

    if (config.deleteFile) {
      fs.unlink(path,function(err){
        if(err) return console.log(err);
        console.log('Deleted chart file.');
      });
    }

    con.end();
  });
});