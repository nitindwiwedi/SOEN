import React, { useEffect, useState, useRef } from "react";
import { SiGooglemessages } from "react-icons/si";
import { useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import chatBotImage from "../assets/chatbot.png";
import axios from "../config/axios";
import {
  initializeSocket,
  receiveMessage,
  sendMessage,
} from "../config/socket.js";
import axiosInstance from "../config/axios";
import { UserContext } from "../context/user.context.jsx";
import MarkDown from "markdown-to-jsx";
import hljs from "highlight.js";
import "highlight.js/styles/atom-one-dark.css";
import { getWebContainer } from "../config/webContainer.js";

function SyntaxHighlightedCode(props) {
  const ref = useRef(null);

  React.useEffect(() => {
    if (ref.current && props.className?.includes("lang-") && window.hljs) {
      window.hljs.highlightElement(ref.current);

      // hljs won't reprocess the element unless this attribute is removed
      ref.current.removeAttribute("data-highlighted");
    }
  }, [props.className, props.children]);

  return <code {...props} ref={ref} />;
}

const Project = () => {
  const location = useLocation();
  const [sidePanel, setSidePanel] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState([]);
  const [users, setUsers] = useState([]);
  const [project, setProject] = useState(location.state.project);
  const [message, setMessage] = useState("");
  const { user } = useContext(UserContext);
  const messageBox = useRef(null);
  const [messages, setMessages] = useState([]);
  const [currentFile, setcurrentFile] = useState(null);
  const [openFiles, setopenFiles] = useState([]);
  const [fileTree, setfileTree] = useState({});
  const [webContainer, setWebContainer] = useState(null);
  const [iframeUrl, setIframeUrl] = useState(null);
  const [runProcess, setRunProcess] = useState(null);
  const [isHidden, setIsHidden] = useState(true);

  console.log(currentFile);
  function addtoCollaborators() {
    axios
      .put("/projects/add-user", {
        projectId: location.state.project._id,
        users: Array.from(selectedUser),
      })
      .then((res) => {
        console.log(res.data);
        setIsModalOpen(false);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  useEffect(() => {
    initializeSocket(project._id);
    if (!webContainer) {
      getWebContainer().then((container) => {
        setWebContainer(container);
        console.log("container started");
      });
    }

    receiveMessage("project-message", (data) => {
      console.log(data);
      const message =
        typeof data.message === "string"
          ? JSON.parse(data.message)
          : data.message;
      if (message.fileTree) {
        setfileTree(message.fileTree);
      }
      webContainer?.mount(message.fileTree);
      setMessages((prev) => [...prev, data]);
      scrollToBottom();
    });

    axios
      .get(`/projects/get-project/${location.state.project._id}`)
      .then((res) => {
        console.log(res.data.project);
        setProject(res.data.project);
        setfileTree(res.data.project.fileTree);
      })
      .catch((err) => {});

    axios
      .get("/users/all")
      .then((res) => {
        setUsers(res.data.getAllusers);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  const send = () => {
    sendMessage("project-message", {
      message,
      sender: user,
    });
    setMessages((prevMessages) => [...prevMessages, { sender: user, message }]);
    setMessage("");
    scrollToBottom();
  };

  function WriteAiMessage(message) {
    let messageObject;
    messageObject = typeof message === "string" ? JSON.parse(message) : message;
    return (
      <div className="overflow-auto bg-slate-950 text-white rounded-sm p-2">
        <MarkDown
          children={messageObject.text}
          options={{
            overrides: {
              code: SyntaxHighlightedCode,
            },
          }}
        />
      </div>
    );
  }

  const handleUserClick = (id) => {
    setSelectedUser((prevSelectedUser) => {
      const newSelectedUser = new Set(prevSelectedUser);
      if (newSelectedUser.has(id)) {
        newSelectedUser.delete(id);
      } else {
        newSelectedUser.add(id);
      }

      return newSelectedUser;
    });
  };

  function savefileTree(ft) {
    axios.put("/projects/update-file-tree", {
      projectId: project._id,
      fileTree: ft,
    }).then((res) => {console.log(res.data);
    }).catch((err)=>{
      console.log(err);
    })
  }
  function scrollToBottom() {
    messageBox.current.scrollTop = messageBox.current.scrollHeight;
  }

  async function runProject() {
    if (!webContainer) {
      console.log("WebContainer is not initialized yet!");
      return;
    }
  
    console.log("Mounting file tree...", fileTree);
    await webContainer.mount(fileTree);
  
    // Check if there's an HTML file
    const htmlFile = Object.keys(fileTree).find((file) => file.endsWith(".html"));
  
    if (htmlFile) {
      console.log("Detected an HTML file. Starting Node.js static server...");
  
      // Create a simple HTTP server inside WebContainer
      const serverCode = `
        const http = require('http');
        const fs = require('fs');
        const path = require('path');
  
        const server = http.createServer((req, res) => {
            let filePath = path.join(process.cwd(), req.url === '/' ? '/index.html' : req.url);
            fs.readFile(filePath, (err, content) => {
                if (err) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Not Found');
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(content, 'utf-8');
                }
            });
        });
  
        server.listen(3000, () => {
            console.log('Server running at http://localhost:3000');
        });
      `;
  
      await webContainer.fs.writeFile("/server.js", serverCode);
  
      const serverProcess = await webContainer.spawn("node", ["server.js"]);
  
      serverProcess.output.pipeTo(
        new WritableStream({
          write(chunk) {
            console.log("Server Output:", chunk);
          },
        })
      );
  
      webContainer.on("server-ready", (port, url) => {
        console.log("Serving HTML at:", url);
        setIframeUrl(url);
      });
  
    } else {
      console.log("No HTML file found. Running npm install...");
      const installProcess = await webContainer.spawn("npm", ["install"]);
  
      installProcess.output.pipeTo(
        new WritableStream({
          write(chunk) {
            console.log("Install Output:", chunk);
          },
        })
      );
  
      console.log("Running npm start...");
      let tempRunProcess = await webContainer.spawn("npm", ["start"]);
  
      tempRunProcess.output.pipeTo(
        new WritableStream({
          write(chunk) {
            console.log("Run Output:", chunk);
          },
        })
      );
  
      setRunProcess(tempRunProcess);
  
      webContainer.on("server-ready", (port, url) => {
        console.log("App is running at:", url);
        setIframeUrl(url);
      });
    }
  }
  
  
  

  return (
    <main className="h-screen w-screen flex">
      {/* <FontAwesomeIcon className="absolute bottom-0 left-2" icon="fa-solid fa-message" /> */}
      <div className="absolute bottom-2 left-5 z-10"><img onClick={()=>{setIsHidden(!isHidden)}} className="w-14 cursor-pointer" src={chatBotImage} alt="" /></div>
      <section className={`left absolute right-0 flex ${isHidden ? "hidden" : ""} flex-col h-screen min-w-96 bg-slate-300 transition-all`}>
        <header className="flex justify-between items-center p-2 px-4 w-full bg-slate-100 absolute z-10 top-0">
          <button className="flex gap-2" onClick={() => setIsModalOpen(true)}>
            <i className="ri-add-fill mr-1"></i>
            <p>Add collaborator</p>
          </button>
          <button onClick={() => setSidePanel(!sidePanel)} className="p-2">
            <i className="ri-group-fill"></i>
          </button>
        </header>
        <div className="conversation-area pt-14 pb-10 flex-grow flex flex-col h-full relative">
          <div
            ref={messageBox}
            className="message-box p-1 flex-grow flex flex-col gap-1 overflow-auto max-h-full scrollbar-hide"
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`${
                  msg.sender._id === "AI" ? "max-w-80" : "max-w-52"
                } ${msg.sender._id == user._id.toString() && "ml-auto"}  
                    message flex flex-col p-2 bg-slate-50 w-fit rounded-md`}
              >
                <small className="opacity-65 text-xs">{msg.sender.email}</small>
                <div className="text-sm">
                  {
                    <p>
                      {msg.sender._id === "AI"
                        ? WriteAiMessage(msg.message)
                        : msg.message}
                    </p>
                  }
                </div>
              </div>
            ))}
          </div>

          <div className="inputfield w-full flex absolute bottom-0">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="p-2 px-4 border-none outline-none flex-grow"
              type="text"
              placeholder="Enter you messages"
            />
            <button
              onClick={send}
              className="px-5 bg-slate-950 flex items-center justify-center text-white"
            >
              <i className="ri-send-plane-fill"></i>
            </button>
          </div>
        </div>

        <div
          className={`sidepanel w-full h-full absolute top-0 flex flex-col gap-2 transition-all ${
            sidePanel ? "-translate-x-0" : "translate-x-full"
          } bg-slate-50`}
        >
          <header className="flex justify-between items-center p-2 px-3 bg-slate-200">
            <h1 className="text-lg font-semibold">Collaborators</h1>
            <button
              onClick={() => {
                setSidePanel(false);
              }}
              className="p-2"
            >
              <i className="text-2xl ri-close-fill"></i>
            </button>
          </header>

          <div className="users flex flex-col gap-2 p-2">
            {project.users &&
              project.users.map((user) => {
                return (
                  <div className="user cursor-pointer flex gap-2 hover:bg-slate-200 items-center">
                    <div className="aspect-square rounded-full p-5 text-white w-fit h-fit flex items-center justify-center bg-slate-700">
                      <i className="ri-user-fill absolute"></i>
                    </div>
                    <h1 className="text-lg font-semibold">{user.email}</h1>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      <section className="right flex-grow bg-red-50 h-full flex">
        <div className="explorer h-full max-w-64 min-w-52 bg-slate-200">
          <div className="file-tree w-full">
            <h1 className="font-bold text-center">FileTree</h1>
            {Object.keys(fileTree).map((file, index) => {
              return (
                <button
                  key={index}
                  onClick={() => {
                    setcurrentFile(file);
                    setopenFiles([...new Set([...openFiles, file])]);
                  }}
                  className="tree-element w-full cursor-pointer p-2 px-4 flex items-center gap-2 bg-slate-400"
                >
                  <p className="font-semibold text-xs">{file}</p>
                </button>
              );
            })}
          </div>
        </div>
        <div className="code-editor flex flex-col flex-grow h-full shrink">
          <div className="top flex justify-between w-full">
            <div className="files flex">
              {openFiles.map((file, index) => (
                <button
                  key={index}
                  onClick={() => setcurrentFile(file)}
                  className={`open-file cursor-pointer p-2 px-4 text-white flex items-center w-fit gap-2 bg-slate-300 ${
                    currentFile === file ? "bg-neutral-600" : ""
                  }`}
                >
                  <p className="font-semibold text-sm">{file}</p>
                </button>
              ))}
            </div>

            <div className="actions flex gap-2">
              <button
                onClick={runProject}
                className="p-2 px-4 bg-green-500 text-white"
              >
                run
              </button>
            </div>
          </div>
          <div className="bottom flex flex-grow max-w-full shrink overflow-auto">
            {fileTree[currentFile] && (
              <div className="code-editor-area h-full overflow-auto flex-grow bg-slate-50">
                <pre className="hljs h-full">
                  <code
                    className="hljs h-full outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const updatedContent = e.target.innerText;
                      const ft = {
                        ...fileTree,
                        [currentFile]: {
                          file: {
                            contents: updatedContent,
                          },
                        },
                      };
                      setfileTree(ft);
                      savefileTree(ft);
                    }}
                    dangerouslySetInnerHTML={{
                      __html: hljs.highlight(
                        "javascript",
                        fileTree[currentFile].file.contents
                      ).value,
                    }}
                    style={{
                      whiteSpace: "pre-wrap",
                      paddingBottom: "25rem",
                      counterSet: "line-numbering",
                    }}
                  />
                </pre>
              </div>
            )}
          </div>
        </div>
        {iframeUrl && webContainer && (
          <div className="flex min-w-96 flex-col h-full">
            <div className="address-bar">
              <input
                type="text"
                onChange={(e) => setIframeUrl(e.target.value)}
                value={iframeUrl}
                className="w-full p-2 px-4 bg-slate-200"
              />
            </div>
            <iframe src={iframeUrl} className="w-full h-full"></iframe>
          </div>
        )}
      </section>
      {/* Add Collaborator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Add Collaborator</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              {/* Search Input */}
            </div>

            {/* Users List */}
            <div className="max-h-96 overflow-y-auto p-4">
              {users.map((user) => (
                <div
                  key={user._id}
                  onClick={() => handleUserClick(user._id)}
                  className={`p-3 mb-2 rounded-md cursor-pointer ${
                    Array.from(selectedUser).indexOf(user._id) != -1
                      ? "bg-blue-100 border-2 border-blue-500"
                      : "hover:bg-gray-100 border-2 border-transparent"
                  } transition-colors`}
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-xl">{user.email[0]}</span>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">
                        {user.email[0] +
                          user.email[1] +
                          user.email[2] +
                          user.email[3]}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Handle adding collaborator here

                    addtoCollaborators();
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  disabled={!selectedUser}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Project;