const debug = true
var log = msg=>{if(debug) console.log(msg)}
var storedTasks = {},
	storedOrgId = "00D41000000f27H", // multiple later
	storedBaseUrl = "jstart.lightning.force.com"
var sessionId,
	apiUrl,
	userId,
	lastUpdateTimestamp,
	tryCount = 0
const regMatchOrgId = /sid=([\w\d]+)/
const regMatchSid = /sid=([a-zA-Z0-9\.\!]+)/
const SFAPI_VERSION = 'v40.0'

var promiseHttp = (args)=>{
	args = Object.assign({ url: "", type: "json", headers: {}, data: {}, method: "GET"}, args)
log(args.method + ": " + args.url)
	let request = { method: args.method, headers: args.headers }
	if(args.url.substring(0,5) != "https")
		args.url = "https://" + args.url
	if(Object.keys(args.data).length > 0)
		request.body = JSON.stringify(args.data)

	return fetch(args.url, request).then((response)=>{
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
var getSessionInfo = tab=>{
log("get session info")
	return new Promise(resolve => {
		resolve(chrome.cookies.getAll({}, all=>{
			if(sessionId == null) {
				all.forEach((c)=>{
					if(c.domain.includes("force.com") && (c.value.includes(storedOrgId) || c.name == "disco")) {
						if(c.name == 'sid' && c.domain.includes("salesforce")) {
							sessionId = c.value
							apiUrl = c.domain
						}
						else if(c.name == 'disco') {// && c.value.includes(storedOrgId)) {
							userId = c.value.match(/005[\w\d]+/)[0]
						}
					}
				})
// need to manually get userId because Salesforce swaps out disco
log(userId)
				if(userId == null) {
					// just get "/services/data/v40.0/"
					// then read "identity" : "https://login.salesforce.com/id/00D41000000f27HEAQ/00541000000gF40AAE"
					// promiseHttp({}
				}
				if(apiUrl != null)
					fetchTasks().then(refreshTaskList.bind(null, tab))
				else
					getSessionInfo(tab)
			}
			else
				fetchTasks().then(refreshTaskList.bind(null, tab))
		})
	)})
}
var getUserId = ()=>userId
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
			url: "https://" + apiUrl + "/services/data/" + SFAPI_VERSION + "/query/?q=SELECT+Id,+Subject,+Priority,+ActivityDate+FROM+Task+WHERE+OwnerId='" + getUserId() + "'+and+isclosed=false",
			headers: {"Authorization": "Bearer " + sessionId, "Content-Type": "application/json" }
		}
		resolve(promiseHttp(args))
	}).then(function(success) {
		storedTasks = success.records
		lastUpdateTimestamp = new Date
		tryCount = 0
	}).catch(function(error) {
		if(tryCount < 3) {
log(error)
			tryCount++
			return new Promise(resolve=>resolve(getSessionInfo)).then(fetchTasks)
		} else {
			chrome.tabs.sendMessage(tab.id, {action: "loadingError", error: "Error loading Salesforce Tasks"}, response => console.log("error"))	
		}
	})
}
var refreshTaskList = tab=>
	chrome.tabs.sendMessage(tab.id, {action: "refreshTaskList", tasks: storedTasks, baseUrl: storedBaseUrl}, response => console.log(response))

var completeTask = taskId=>{}

var init = tab=>getSessionInfo(tab)
chrome.tabs.onCreated.addListener(tab=>init(tab))