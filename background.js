const debug = true
var log = (msg)=> {if(debug) console.log(msg)}
var tasks = {},
	orgId, // retrieve or allow multiple?
	sessionId,
	apiUrl,
	userId
const regMatchOrgId = /sid=([\w\d]+)/
const regMatchSid = /sid=([a-zA-Z0-9\.\!]+)/
const SFAPI_VERSION = 'v40.0'

let promiseHttp = (args)=>{
	args = Object.assign({ targetUrl: "", type: "json", headers: {}, data: {}, method: "GET"}, args)
	let request = { method: args.method, headers: args.headers }
	if(args.targetUrl.substring(0,5) != "https")
		args.targetUrl = "https://" + args.targetUrl
	if(Object.keys(args.data).length > 0)
		request.body = JSON.stringify(args.data)

	return fetch(args.targetUrl, request).then((response)=>{
		switch(args.type) {
			case "json": return response.clone().json()
			case "document": return response.clone().text()
		}
	}).then((data)=>{
		if(typeof data == "string")
			return (new DOMParser()).parseFromString(data, "text/html")
		else
			return data
	})
}
let getSessionInfo = ()=>{
	chrome.cookies.getAll({}, (all)=>{
		all.forEach((c)=>{
			if(c.domain.includes("force.com") && (c.value.includes(orgId) || c.name == "disco")) {
				if(c.name == 'sid') {
					sessionId = c.value
					apiUrl = c.domain
				}
				else if(c.name == 'disco') userId = c.value.match(/005[\w\d]+/)[0]
			}
		})
	})
}
let getUserId = ()=>userId
let createTask = function(subject) {
	if(subject != "" && getUserId()) {
		promiseHttp({
			method: "POST",
			url: "https://" + apiUrl + "/services/data/" + SFAPI_VERSION + "/sobjects/Task",
			headers: {"Authorization": "Bearer " + sessionId, "Content-Type": "application/json" },
			data: {"Subject": subject, "OwnerId": getUserId()}
		})
		.then(function (reply) {
			if(reply.errors.length == 0) {
				// commands["Go To Created Task"] = {url: "/"+ reply.id }
			} else {
				log(response)
			}
			hideLoadingIndicator()					
		})
	}
}
let fetchTasks = ()=>{
	promiseHttp({
		url: "https://" + apiUrl + "/services/data/" + SFAPI_VERSION + "/tooling/query/?q=SELECT+Id,+Subject+FROM+Task+WHERE+OwnerId='" + getUserId() + "'+and+isclosed=false",
		headers: {"Authorization": "Bearer " + sessionId, "Content-Type": "application/json" })
	})
	.then(function(success) {
		let numberOfUserRecords = success.records.length
		for (var i = 0; i < success.records.length; i++) {
			success.records[i].Subject
		}
	}).catch(function(error) {
		hideLoadingIndicator()
		log(error)
		addError(error)
	})
}

chrome.commands.onCommand.addListener((command)=>{
	switch(command) {
	}
})
chrome.runtime.onMessage.addListener((request, sender, sendResponse)=>{
	switch(request.action) {
	}
	return true
})