const debug = false
var log = msg=>{if(debug) console.log(msg)}

var storedOrderBy = "Priority desc"
var orgs = {},
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
var init = tab=>{
log("get session info")
	return new Promise(resolve => {
		resolve(chrome.cookies.getAll({}, all=>{
			all.forEach((c)=>{
				if(c.domain.includes("salesforce.com")) {
					if(c.name == 'sid' && c.domain.includes("salesforce")) {
						orgId = c.value.match(/00D\w+/)[0]
						if(orgs[orgId] == null) {
							orgs[orgId] = {
								orgId: orgId,
								sessionId: c.value,
								apiUrl: c.domain,
								userId: null,
								lastUpdateTimestamp: null,
								tasks: []
							}
						}
					}
				}
			})
			for(oId in orgs) {
				if(orgs[oId].userId == null)
					promiseHttp({url: "https://" + orgs[oId].apiUrl + '/services/data/' + SFAPI_VERSION, headers:
						{"Authorization": "Bearer " + orgs[oId].sessionId, "Accept": "application/json"}
					}).then(response => {
						orgs[oId].userId = response.identity.match(/005.*/)[0]
						fetchTasks(oId).then(refreshTaskList.bind(null, tab, oId))
					})
				else  // always fetches new right now, going to implement some kind of caching even though it runs pretty fast as is
					fetchTasks(oId).then(refreshTaskList.bind(null, tab, oId))
			}
		}))
	})
}
var fetchTasks = (oId)=>{
log("fetch tasks")
	return new Promise(resolve => {
		let args = {
			url: "https://" + orgs[oId].apiUrl + "/services/data/" + SFAPI_VERSION + "/query/?q=SELECT+Id,+Subject,+Priority,+ActivityDate+FROM+Task+WHERE+OwnerId='" + orgs[oId].userId + "'+and+isclosed=false+order+by+" + storedOrderBy.replace(" ","+"),
			headers: {"Authorization": "Bearer " + orgs[oId].sessionId, "Content-Type": "application/json" }
		}
		resolve(
			promiseHttp(args).then(function(success) {
				orgs[oId].tasks = success.records
				orgs[oId].lastUpdateTimestamp = new Date
				tryCount = 0
			}).catch(function(error) {
				if(tryCount < 3) {
					log(error)
					tryCount++
					return new Promise(resolve=>resolve(init)).then(fetchTasks) // this is real suspect
				} else {
					chrome.tabs.sendMessage(tab.id, {action: "loadingError", error: "Error loading Salesforce Tasks"}, response => console.log("error"))	
				}
			})
		)
	})
}
var refreshTaskList = (tab, oId)=>
	chrome.tabs.sendMessage(tab.id, {action: "refreshTaskList", tasks: orgs[oId].tasks, baseUrl: orgs[oId].apiUrl}, response => console.log(response))
chrome.tabs.onCreated.addListener(tab=>init(tab))

// var createTask = subject=>{
// 	if(subject != "" && getUserId()) {
// 		promiseHttp({
// 			method: "POST",
// 			url: "https://" + apiUrl + "/services/data/" + SFAPI_VERSION + "/sobjects/Task",
// 			headers: {"Authorization": "Bearer " + sessionId, "Content-Type": "application/json" },
// 			data: {"Subject": subject, "OwnerId": getUserId()}
// 		})
// 		.then(function (reply) {
// 			if(reply.errors.length == 0) {
// 				// commands["Go To Created Task"] = {url: "/"+ reply.id }
// 			} else
// 				log(response)
// 		})
// 	}
// }
// var completeTask = taskId=>{}