require("dotenv").config();
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const API_KEY = process.env.API_KEY;

let apps = {};
if (fs.existsSync("./apps.json")) {
	apps = JSON.parse(fs.readFileSync("./apps.json").toString());
}
let data = {};
if (fs.existsSync("./data.json")) {
	data = JSON.parse(fs.readFileSync("./data.json").toString());
}

/**
 *  Stuff I copied from a gist to track start and end time
 *  https://gist.github.com/gnurgeldiyev/cbca8cc4dd0b4e144d0bd55ff3412ee5
 */

axios.interceptors.request.use(
	config => {
		const newConfig = { ...config }
		newConfig.metadata = { startTime: new Date() }
		return newConfig
	},
	error => {
		return Promise.reject(error)
	}
)

axios.interceptors.response.use(
	response => {
		const newRes = { ...response }
		newRes.config.metadata.endTime = new Date()
		newRes.duration =
			newRes.config.metadata.endTime - newRes.config.metadata.startTime
		return newRes
	},
	error => {
		const newError = { ...error }
		newError.config.metadata.endTime = new Date()
		newError.duration =
			newError.config.metadata.endTime - newError.config.metadata.startTime
		return Promise.reject(newError)
	}
)



const app = express();

app.get("/", a, (req, res) => {
	let tracking = ""
	Object.keys(apps).forEach((key) => {
		tracking += `${key}: ${apps[key].url}<br>`;
	});
	res.send(`tracking: <br> ${tracking}`);
});

app.post("/track", a, (req, res) => {
	const { url, name } = req.query;
	if (!url || !name) {
		res.status(400).send("Missing id or name");
		return;
	}
	apps[name] = { url, name };
	data[name] = [];
	fs.writeFileSync("./apps.json", JSON.stringify(apps, null, 4));
	fs.writeFileSync("./data.json", JSON.stringify(data, null, 4));
	res.send("ok");
})

app.get("/:name", a, (req, res) => {
	if (!apps[req.params.name] || !data[req.params.name]) return res.status(404).send("no such app");
	res.send(data[req.params.name]);
})

const timedTrack = async () => {
	Object.keys(apps).forEach((key) => { track(key); });
}
timedTrack();
setInterval(timedTrack, 1000 * 60 * 5);

function track(name) {
	console.log(`tracking ${name}`);
	let url = apps[name].url;
	axios.get(url).then((res) => {
		data[name].push({
			timestamp: new Date().getTime(),
			statusCode: res.status,
			duration: res.duration
		});
		fs.writeFileSync("./data.json", JSON.stringify(data, null, 4));
	}).catch((err) => {
		data[name].push({
			timestamp: new Date().getTime(),
			statusCode: err.response.status,
			duration: -1
		});
		fs.writeFileSync("./data.json", JSON.stringify(data, null, 4));
	});
}

function a(req, res, next) {
	if (req.query.key === API_KEY) {
		next();
	} else {
		res.status(401).send("Unauthorized");
	}
}

app.listen(3000, () => {
	console.log("Server started on port 3000");
});