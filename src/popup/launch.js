/* global tabs:false, window:false, browser:false */

(function () {
    'use strict';

    // Sections
    let addTaskSection = document.getElementById('content');
    let addListSection = document.getElementById('add-list');
    let loginSection = document.getElementById('login');
    let statusSection = document.getElementById('status');

    // Buttons
    let addListSubmitButton = document.getElementById('add-list-submit');
    let addListCancelButton = document.getElementById('add-list-cancel');
    let addTaskSubmitButton = document.getElementById('add-task-submit');
    let permissionSubmitButton = document.getElementById('permissions-submit');
    let listRefreshButton = document.getElementById('lists-refresh');
    let listPlusButton = document.getElementById('lists-plus');

    // Status
    let statusImg = document.getElementById('status-img');
    let statusMsg = document.getElementById('status-msg');

    // Form Elements
    let taskElement = document.getElementById('task');
    let taskLabel = document.getElementById('task-label');
    let linkElement = document.getElementById('link');
    let linkLabel = document.getElementById('link-label');
    let listsElement = document.getElementById('lists');


    let selectedElement = document.getElementById('selected-text');
    // var selectedLabel = document.getElementById('selected-text-label');
    //
    let addListElement = document.getElementById('list');
    let addListLabel = document.getElementById('list-label');
    // var addlistStatus = document.getElementById('add-list-status');

	let validationRegex = new RegExp('^https?://');

	function handleError(error) {
        console.log(`Launch error: ${error}`);
    }

	// Initialization
	document.addEventListener('DOMContentLoaded', () => {

        browser.runtime.sendMessage({action: "userReady"}).then((response) => {
            if (response){
                showAddTask();
            } else {
                showSection(loginSection);
            }
        }, handleError);

		addListSubmitButton.addEventListener('click', () => {
            if (addListElement.value !== '') {
                setTextElement(addListLabel, 'New List:');
                addListSubmitButton.disabled = true;
                addListCancelButton.disabled = true;
                let addListArguments = {
                    action: 'addList',
                    listName: addListElement.value
                };
                browser.runtime.sendMessage(addListArguments).then(() => {
                    showSection(addTaskSection);
                });
            } else {
                setTextElement(addListLabel, 'New List: List name can\'t be empty.');
            }
		}, false);

		addListCancelButton.addEventListener('click', () => {
			showSection(addTaskSection);
		}, false);

		addTaskSubmitButton.addEventListener('click', () => {
            let formValid = true;
            if (taskElement.value !== '') {
                setTextElement(taskLabel, 'Task:');
            } else {
                setTextElement(taskLabel, 'Task: Task name can\'t be empty.');
                formValid = false;
            }
            if (linkElement.value === '' || validationRegex.test(linkElement.value)) {
                setTextElement(linkLabel, 'Link:');
            } else {
                setTextElement(linkLabel, 'Link: Links must start with \'http://\' or \'https://\'.');
                formValid = false;
            }
            if (formValid) {
                showMessage('Sending task to RTM', 'loading');
                let addTaskArguments = {
                    action: 'addTask',
                    name: taskElement.value,
                    link: linkElement.value,
                    useSelection: selectedElement.checked,
                    selection: selectedElement.value,
                    listId: listsElement.value
                };
                browser.runtime.sendMessage(addTaskArguments);
            }
		}, false);

		permissionSubmitButton.addEventListener('click', () => {
            showMessage('Requesting permission', 'loading');
            browser.runtime.sendMessage({action: "authorise"});
		}, false);

		listRefreshButton.addEventListener('click', () => {
            setIconState(listRefreshButton.firstElementChild, 'loading');
            browser.runtime.sendMessage({action: "refreshLists"}).catch((error) => {
                setIconState(listRefreshButton.firstElementChild, 'error');
                setTimeout(() => {
                    setIconState(listRefreshButton.firstElementChild, 'refresh');
                }, 1000);
            });
		}, false);

		listPlusButton.addEventListener('click', () => {
            setTextElement(addListLabel, 'New List:');
            addListSubmitButton.disabled = false;
            addListCancelButton.disabled = false;
			showSection(addListSection);
		}, false);

	});

	function handleMessage(message, sender, sendResponse) {
        console.log(`Message received in the popup script: ${message.action} - ${sender.id}`);
        switch(message.action) {
            case "listsRefreshed":
                browser.storage.local.get('defaultList').then((defaultList) => {
                    browser.runtime.sendMessage({action: "lists"}).then((lists) => {
                        updateLists(lists, defaultList);
                        setIconState(listRefreshButton.firstElementChild, 'done');
                        setTimeout(() => {
                            setIconState(listRefreshButton.firstElementChild, 'refresh');
                        }, 1000);
                    });
                });
                break;
            case "listsRefreshedError":
                browser.storage.local.get('defaultList').then((defaultList) => {
                    browser.runtime.sendMessage({action: "lists"}).then((lists) => {
                        updateLists(lists, defaultList);
                        setIconState(listRefreshButton.firstElementChild, 'error');
                        setTimeout(() => {
                            setIconState(listRefreshButton.firstElementChild, 'refresh');
                            }, 1000);
                    });
                });
                break;
            case "taskAdded":
                break;
            case "listAdded":
                break;
            default:
                console.log(`Unrecognised message with query "${request}"`);
        }
    }

	let showMessage = (message, icon) => {
		setTextElement(statusMsg, message);
		setIconState(statusImg, icon);
		showSection(statusSection);
	};

	let showSection = (element) => {
		let sections = document.getElementsByClassName("section");
		for (let section of sections) {
			section.classList.add('hide');
		}
		element.classList.remove('hide');
	};

	let setIconState = (icon, iconName) => {
		icon.setAttribute('src', '../images/' + iconName + '.svg');
	};

	let setTextElement = (label, text) => {
		let firstTextElement;
		let children = label.childNodes;
		for (let child of children) {
			if (child.nodeName === '#text') {
				firstTextElement = child;
				break;
			}
		}
		if (firstTextElement) {
			label.replaceChild(document.createTextNode(text), firstTextElement);
		} else {
			label.appendChild(document.createTextNode(text));
		}
	};

    let showAddTask = () => {
        browser.storage.local.get().then((settings) => {
            browser.tabs.query({active: true}).then((activeTabs) => {
                browser.runtime.sendMessage({action: "lists"}).then((lists) => {
                    setTextElement(taskLabel, 'Task:');
                    setTextElement(linkLabel, 'Link:');
                    let link =  activeTabs[0].url;
                    if (link.startsWith('about:')) {
                        link = '';
                    }
                    taskElement.value = settings.useTitle ? activeTabs[0].title : '';
                    linkElement.value = settings.useLink ? link : '';
                    taskElement.focus();
                    updateLists(lists, settings.defaultList || "Read Later");
                    showSection(addTaskSection);
                }, handleError);
            }, handleError);
        }, handleError);
    };

    let updateLists = (lists, defaultList) => {
        console.log(`update lists, count: ${lists.length} - default: ${defaultList}`);
        while (listsElement.firstChild) {
            listsElement.removeChild(listsElement.firstChild);
        }
        let defaultFound = false;
        for (let i = 0; i < lists.length; i++) {
            if (lists[i].smart == '0') {
                let selected = defaultList === lists[i].name;
                if (selected) {
                    defaultFound = true;
                }
                let newOption = createOptionElement(lists[i].id, lists[i].name, selected);
                listsElement.appendChild(newOption);
            }
        }
        if (!defaultFound) {
            listsElement.selectedIndex = "0";
        }
    };

    let createOptionElement = (id, name, selected) => {
        let option = document.createElement('option');
        option.value = id;
        let label = document.createTextNode(name);
        option.appendChild(label);
        if (selected) {
            option.setAttribute('selected', 'selected');
        }
        return option;
    };

    browser.runtime.onMessage.addListener(handleMessage);

}());

	// taskElement.addEventListener('keyup', (event) => {
	// 	if (event.keyCode === 13) {
	// 		linkElement.focus();
	// 	}
	// }, false);
	//
	// linkElement.addEventListener('keyup', (event) => {
	// 	if (event.keyCode === 13) {
	// 		submitButton.focus();
	// 	}
	// }, false);