let baseUrl,
	selectedTheme
let themes = {
	"base": {
		secondary: "rgba(27,95,158,1)",
		secondaryTransparent: "rgba(27,95,158,0.05)",
		primary: "rgba(176,196,223,1)",
		backgroundImage: "linear-gradient(0deg, rgba(176,196,223,1) 70%, rgba(27,95,158,1) 100%)",
		iconWidth: "1.2rem",
		iconHigh: "\235f",
		iconNormal: "\20dd",
		iconLow: "\25cc"
	},
	"emoji": {
		secondary: "rgba(158,27,95,1)",
		secondaryTransparent: "rgba(158,27,95,0.05)",
		primary: "rgba(223,176,196,1)",
		backgroundImage: "linear-gradient(0deg, rgba(223,176,196,1) 70%, rgba(158,27,95,1) 100%)",
		iconWidth: "1.6rem",
		iconHigh: "\1f632",
		iconNormal: "\1f642",
		iconLow: "\1f636"
	}
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse)=>{
	let response = {}
	switch(request.action) {
		case "refreshTaskList":
			baseUrl = request.baseUrl
			applyTheme(request.theme)
			refreshTaskList(request.tasks)
			break
	}
	sendResponse({updatedOn:"1"})
	return true
})
let refreshTaskList = tasks=>{
	let list = document.getElementById("taskList")
	list.innerHTML = ""
	for (var i = 0; i < tasks.length; i++) {
		let taskLink = document.createElement("a")
		taskLink.setAttribute("href", "https://" + baseUrl + "/" + tasks[i].Id)
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
	taskCount.innerHTML = "<span>" + tasks.length + "</span> Open Tasks"
	let lastUpdated = document.getElementById("lastUpdated")
	lastUpdated.innerText = "Last Update: " + (new Date).toLocaleString()
	taskList.style.opacity = 1
	document.getElementById("infoBox").style.opacity = 1
}
let applyTheme = theme=>{
	selectedTheme = theme
	let root = document.documentElement
	document.getElementById("bodyTag").style.backgroundImage = theme.backgroundImage
	root.style.setProperty('--secondary', theme.secondary)
	root.style.setProperty('--secondaryTransparent', theme.secondaryTransparent)
	root.style.setProperty('--primary', theme.primary)
	root.style.setProperty('--backgroundImage', theme.backgroundImage)
	root.style.setProperty('--iconWidth', theme.iconWidth)
	root.style.setProperty('--iconHigh', theme.iconHigh)
	root.style.setProperty('--iconNormal', theme.iconNormal)
	root.style.setProperty('--iconLow', theme.iconLow)
}
let save = ()=>{
	let storedOrgId = document.getElementById("storedOrgId")
	let storedTheme = document.getElementById("storedTheme")
	let storedOrderBy = document.getElementById("storedOrderBy")
	chrome.runtime.sendMessage({
		action:'storeSettings',
		storedOrgId: storedOrgId,
		storedTheme: storedTheme,
		storedOrderBy: storedOrderBy
	}, response=>{})
}