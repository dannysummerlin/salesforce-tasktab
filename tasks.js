let baseUrl,
	theme = ""
	// theme = "-emoji"
chrome.runtime.onMessage.addListener((request, sender, sendResponse)=>{
	let response = {}
	switch(request.action) {
		case "refreshTaskList":
			baseUrl = request.baseUrl
			refreshTaskList(request.tasks)
			sendResponse(new Date)
			break
	}
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
		listItem.classList.add("priority-" + tasks[i].Priority.toLowerCase() + theme)
		listItem.appendChild(taskLink)
		list.appendChild(listItem)
	}
	document.getElementById("loader").style.display = "none"
	let lastUpdated = document.getElementById("lastUpdated")
	lastUpdated.innerText = (new Date).toLocaleString()
	let taskCount = document.getElementById('taskCount')
	taskCount.innerText = tasks.length
	document.getElementById("bodyTag").style.backgroundImage = "linear-gradient(0deg, rgba(176,196,223,1) 70%, rgba(27,95,158,1) 100%)"
	taskList.style.opacity = 1
	document.getElementById("infoBox").style.opacity = 1
}