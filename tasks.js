let baseUrl
document.addEventListener("DOMContentLoaded", ()=>{
	chrome.runtime.sendMessage({action: "tabOpened"}, response =>{})
	document.getElementById("storedTheme").addEventListener("change", e=>{
		chrome.runtime.sendMessage({action: "saveTheme", theme: e.target.value}, response =>{})
	})
	document.getElementById("storedLimit").addEventListener("change", e=>{
		chrome.runtime.sendMessage({action: "saveLimit", limit: e.target.value}, response =>{})
	})
	document.getElementById("refreshButton").addEventListener("click", e=>{
		chrome.runtime.sendMessage({action: "refreshTaskList"}, response =>{})
		document.getElementById("loader").style.display = "block"
		taskList.style.opacity = 0
	})
})
// chrome.browserAction.onClicked.addListener(tab=>{
	//	chrome.tabs.executeScript(tab.id, {code: "document.getElementsByTagName"})
	// })
chrome.runtime.onMessage.addListener((request, sender, sendResponse)=>{
	switch(request.action) {
		case "refreshTaskList":
			baseUrl = request.baseUrl
			refreshTaskList(request.tasks)
			break
		case 'applyTheme':
			document.getElementById('storedTheme').value = request.theme
			applyTheme(request.theme)
			break
		case 'applyLimit':
			document.getElementById('storedLimit').value = request.limit
			break
	}
	sendResponse(new Date)
	return true
})

let refreshTaskList = tasks=>{
	let list = document.getElementById("taskList")
	list.innerHTML = ""
	for (var i = 0; i < tasks.length; i++) {
		let taskLink = document.createElement("a")
		if(tasks[i].Id != null)
			taskLink.setAttribute("href", "https://" + baseUrl + "/" + tasks[i].Id)
		else
			taskLink.setAttribute("href", tasks[i].LoginUrl)
		taskLink.innerText = tasks[i].Subject
		let taskDate = document.createElement("span")
		taskDate.innerText = tasks[i].ActivityDate
		taskLink.appendChild(taskDate)
		let listItem = document.createElement("li")
		listItem.classList.add("priority-" + tasks[i].Priority.toLowerCase())
		listItem.appendChild(taskLink)
		list.appendChild(listItem)
	}
	document.getElementById("loader").style.display = "none"
	let taskCount = document.getElementById('taskCount')
	document.getElementById("allTasks").setAttribute("href", "https://" + baseUrl + "/00T")
	taskCount.innerHTML = "<span>" + tasks.length + "</span> Open Tasks" + (tasks.length == taskLimit ? "<small style='display:block;padding-top:4px;font-size:11px'><em>limited to "+taskLimit+"</em></small>" : '')
	let lastUpdated = document.getElementById("lastUpdated")
	lastUpdated.innerText = "Last Update: " + (new Date).toLocaleString()
	taskList.style.opacity = 1
	document.getElementById("infoBox").style.opacity = 1
}
let applyTheme = themeName=>{
	theme = themes[themeName]
	let root = document.documentElement
	document.body.style.backgroundImage = theme.backgroundImage
	document.body.className = theme.name
	root.style.setProperty('--primary', theme.primary)
	root.style.setProperty('--primaryTransparent', theme.primaryTransparent)
	root.style.setProperty('--secondary', theme.secondary)
	root.style.setProperty('--secondaryTransparent', theme.secondaryTransparent)
	root.style.setProperty('--backgroundImage', theme.backgroundImage)
}