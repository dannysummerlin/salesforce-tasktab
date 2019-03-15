const debug = false
var log = msg=>{if(debug) console.log(msg)}

var storedOrderBy = "Priority desc"
var orgs = { empty: { apiUrl: "/", tasks: [{
		Id: null,
		LoginUrl: "https://login.salesforce.com",
		Subject: "Please login to Salesforce to load your Tasks",
		ActivityDate: "",
		Priority: "High"
	}]}},
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
var init = force=>{
log("get session info")
	return new Promise(resolve => {
		applyTheme()
		resolve(chrome.cookies.getAll({}, all=>{
			all.forEach((c)=>{
				if(c.domain.includes("salesforce.com")) {
					if(c.name == 'sid') {
						orgId = c.value.match(/00D\w+/)[0]
						if(!Object.keys(orgs).includes(orgId) || orgs[orgId].sessionId != c.value)
							orgs[orgId] = {
								orgId: orgId,
								sessionId: c.value,
								apiUrl: c.domain,
								userId: null,
								lastUpdateTimestamp: null,
								tasks: []
							}
						delete orgs.empty
					}
				}
			})
			if(!Object.keys(orgs).includes("empty")) {
				for(var oId in orgs) {
					if(orgs[oId].userId == null || force)
						promiseHttp({url: "https://" + orgs[oId].apiUrl + '/services/data/' + SFAPI_VERSION, headers:
							{"Authorization": "Bearer " + orgs[oId].sessionId, "Accept": "application/json"}
						}).then(response => {
							orgs[oId].userId = response.identity.match(/005.*/)[0]
							fetchTasks(oId).then(refreshTaskList.bind(null, oId))
						}).catch(response => {
							log(response)
						})
					else
						refreshTaskList(oId)
				}
			} else
				refreshTaskList("empty")
		}))
	})
}
var refreshTaskList = oId=>{
	chrome.runtime.sendMessage({action: "refreshTaskList", tasks: orgs[oId].tasks, baseUrl: orgs[oId].apiUrl}, response => log(response))
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
					console.log(tryCount, error)
					tryCount++
					return new Promise(resolve=>resolve(init)).then(fetchTasks) // this is real suspect
				} else
					chrome.runtime.sendMessage({action: "loadingError", error: "Error loading Salesforce Tasks"}, response => log(response))
			})
		)
	})
}
var applyTheme = ()=>chrome.storage.sync.get(['theme'], (result)=>{
	theme = result.theme == null ? "base" : result.theme
	chrome.runtime.sendMessage({action: "applyTheme", theme: theme}, response => log(response))
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse)=>{
	switch(request.action) {
		case 'refreshTaskList':
			init(true)
			break
		case 'tabOpened':
			init()
			break
		case 'saveTheme':
			chrome.storage.sync.set({theme: request.theme}, ()=>{ applyTheme() })
			break
	}
	sendResponse(request)
	return true
})
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