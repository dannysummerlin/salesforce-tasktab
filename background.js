const debug = true
var log = msg=>{if(debug) console.log(msg)}
var tasks = {},
	orgId = "00D540000000kjy", // retrieve or allow multiple?
	sessionId,
	apiUrl,
	userId,
	lastUpdateTimestamp,
	tryCount = 0
const regMatchOrgId = /sid=([\w\d]+)/
const regMatchSid = /sid=([a-zA-Z0-9\.\!]+)/
const SFAPI_VERSION = 'v40.0'

var promiseHttp = (args)=>{
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
var getSessionInfo = ()=>{
log("get session info")
	return new Promise(resolve => {
		resolve(chrome.cookies.getAll({}, (all)=>{
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
	)})
}
var getUserId = ()=>userId
var completeTask = taskId=>{}
var createTask = subject=>{
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
			} else
				log(response)
		})
	}
}
var fetchTasks = ()=>{
log("fetch tasks")
	return new Promise(resolve => {
		let args = {
			url: "https://" + apiUrl + "/services/data/" + SFAPI_VERSION + "/tooling/query/?q=SELECT+Id,+Subject+FROM+Task+WHERE+OwnerId='" + getUserId() + "'+and+isclosed=false",
			headers: {"Authorization": "Bearer " + sessionId, "Content-Type": "application/json" }
		}
		resolve(promiseHttp(args))
	}).then(function(success) {
log(success)
		let numberOfUserRecords = success.records.length
		for (var i = 0; i < success.records.length; i++) {
			success.records[i].Subject
		}
		lastUpdateTimestamp = new Date
		tryCount = 0
	}).catch(function(error) {
		if(tryCount < 3) {
log(error)
			tryCount++
			return new Promise(resolve=>resolve(getSessionInfo)).then(fetchTasks)
		}
	})
}
var refreshTaskList = tab=>
	chrome.tabs.sendMessage(tab.id, {action: "refreshTaskList", tasks: tasks}, response => console.log(response))

var init = tab=>{
	getSessionInfo().then(fetchTasks).then(refreshTaskList.bind(null, tab))
}
chrome.tabs.onCreated.addListener(tab=>init(tab))