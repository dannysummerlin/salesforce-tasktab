chrome.runtime.onMessage.addListener((request, sender, sendResponse)=>{
	let response = {}
	switch(request.action) {
		case "refreshTaskList":
			refreshTaskList(request.tasks)
			sendResponse(new Date)
			break
	}
	return true
}
let refreshTaskList = tasks=>{
	console.log(tasks)
	let list = document.getElementById("taskList")
	list.innerHTML = ""
	for (var i = 0; i < tasks.length; i++) {
		let taskLink = document.createElement("a")
		taskLink.setAttribute("href", "/" + tasks[i].Id)
		taskLink.innerText = tasks[i].Subject
		let listItem = document.createElement("li")
		listItem.appendChild(taskLink)
		list.appendChild(listItem)
	}
	let lastUpdated = document.getElementById("lastUpdated")
	lastUpdated.innerText = (new Date).toLocaleString()
	let taskCount = document.getElementById('taskCount')
	taskCount.innerText = tasks.length
}