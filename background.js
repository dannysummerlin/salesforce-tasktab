const debug = true
var log = msg=>{if(debug) console.log(msg)}
var storedTasks = {},
	storedOrderBy = "Priority desc",
	storedOrgId = "00D41000000f27H" // multiple later
var sessionId,
	baseUrl,
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
			if(sessionId == null || userId == null) {
				all.forEach((c)=>{
					if(c.domain.includes("salesforce.com") && c.value.includes(storedOrgId)) {
						if(c.name == 'sid' && c.domain.includes("salesforce")) {
							sessionId = c.value
							apiUrl = c.domain
						}
					}
				})
				promiseHttp({url: "https://" + apiUrl + '/services/data/' + SFAPI_VERSION, headers:
					{"Authorization": "Bearer " + sessionId, "Accept": "application/json"}
				}).then(response => {
					userId = response.identity.match(/005.*/)[0]
					if(apiUrl != null)
						fetchTasks().then(refreshTaskList.bind(null, tab))
					else
						getSessionInfo(tab)
				})
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
			url: "https://" + apiUrl + "/services/data/" + SFAPI_VERSION + "/query/?q=SELECT+Id,+Subject,+Priority,+ActivityDate+FROM+Task+WHERE+OwnerId='" + getUserId() + "'+and+isclosed=false+order+by+" + storedOrderBy.replace(" ","+"),
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
	chrome.tabs.sendMessage(tab.id, {action: "refreshTaskList", tasks: storedTasks, baseUrl: apiUrl}, response => console.log(response))

var completeTask = taskId=>{}

var init = tab=>getSessionInfo(tab)
chrome.tabs.onCreated.addListener(tab=>init(tab))