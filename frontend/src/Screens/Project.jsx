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
  const [ServerProcess, setServerProcess] = useState(null);
  const [isHidden, setIsHidden] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);

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
    if (!message.trim()) return;

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
    console.log(messageObject.explanation);
    return (
      <div className="overflow-auto bg-slate-950 text-white rounded-md p-3 shadow-md">
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
    axios
      .put("/projects/update-file-tree", {
        projectId: project._id,
        fileTree: ft,
      })
      .then((res) => {
        console.log(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }
  function scrollToBottom() {
    messageBox.current.scrollTop = messageBox.current.scrollHeight;
  }

  async function runProject() {
    if (!webContainer) {
        console.error("❌ WebContainer is not initialized yet!");
        return;
    }

    console.log("📂 Mounting file tree...");
    try {
        await webContainer.mount(fileTree);
        console.log("✅ File tree mounted successfully!");

        const htmlFile = Object.keys(fileTree).find((file) => file.endsWith(".html"));

        if (htmlFile) {
            console.log("📄 HTML file detected. Starting server...");

            // Kill any existing Node.js process before starting a new one
            console.log("🛑 Stopping existing server process...");
            await webContainer.spawn("pkill", ["-f", "node"]).catch(() => {
                console.log("⚠️ No previous process found.");
            });

            // Create a dynamic port for the server
            const serverCode = `
                const http = require('http');
                const fs = require('fs');
                const path = require('path');

                const mimeTypes = {
                    '.html': 'text/html',
                    '.css': 'text/css',
                    '.js': 'application/javascript'
                };

                const PORT = process.env.PORT || 4000;

                const server = http.createServer((req, res) => {
                    let filePath = path.join(process.cwd(), req.url === '/' ? '/index.html' : req.url);
                    let extname = path.extname(filePath);
                    let contentType = mimeTypes[extname] || 'application/octet-stream';

                    fs.readFile(filePath, (err, content) => {
                        if (err) {
                            res.writeHead(404, { 'Content-Type': 'text/plain' });
                            res.end('Not Found');
                        } else {
                            res.writeHead(200, { 'Content-Type': contentType });
                            res.end(content, 'utf-8');
                        }
                    });
                });

                server.listen(PORT, () => {
                    console.log(\`🚀 Server running at http://localhost:\${PORT}\`);
                });
            `;

            console.log("📝 Writing server.js...");
            await webContainer.fs.writeFile("/server.js", serverCode);
            console.log("✅ server.js written successfully!");
            if(ServerProcess){
              ServerProcess.kill();
              setServerProcess(null);
            }
            console.log("🚀 Spawning server process...");
            const serverProcess = await webContainer.spawn("node", ["server.js"]);
            console.log("✅ Server process started!");

            serverProcess.output.pipeTo(
                new WritableStream({
                    write(chunk) {
                        console.log("Server Output:", chunk);
                    },
                })
            );
            setServerProcess(serverProcess);
            webContainer.on("server-ready", (port, url) => {
                console.log("🌍 Serving HTML at:", url);
                setIframeUrl(url);
            });

        } else {
            console.log("⚠️ No HTML file found. Running npm install...");
            const installProcess = await webContainer.spawn("npm", ["install"]);
            await installProcess.exit;

            console.log("✅ npm install completed!");
            console.log("▶️ Running npm start...");

            if(ServerProcess){
              ServerProcess.kill();
              setServerProcess(null);
            }
            const runProcess = await webContainer.spawn("npm", ["start"]);

            runProcess.output.pipeTo(
                new WritableStream({
                    write(chunk) {
                        console.log("Run Output:", chunk);
                    },
                })
            );
            setServerProcess(runProcess);
            webContainer.on("server-ready", (port, url) => {
                console.log("🚀 App is running at:", url);
                setIframeUrl(url);
            });
        }
    } catch (error) {
        console.error("❌ Error during execution:", error);
    }
}


  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <main className="h-screen w-screen flex bg-gray-100 overflow-hidden relative">
      {/* Chat bot toggle button with animation */}
      <div className="absolute bottom-4 left-5 z-20">
        <div
          className={`transition-all duration-300 ${
            isHidden ? "" : "animate-pulse"
          }`}
        >
          <img
            onClick={() => setIsHidden(!isHidden)}
            className="w-14 cursor-pointer hover:scale-110 transition-transform duration-200 shadow-lg rounded-full"
            src={chatBotImage}
            alt="Chat Bot"
          />
        </div>
      </div>

      {/* Chat panel with smooth transition */}
      <section
        className={`left absolute right-0 flex flex-col h-[90%] w-96 bg-white shadow-lg transition-all duration-300 ease-in-out z-10 ${
          isHidden ? "translate-x-full" : "translate-x-0"
        }`}
      >
        <header className="flex justify-between items-center p-3 px-4 w-full bg-slate-800 text-white shadow-md">
          <button
            className="flex gap-2 items-center hover:bg-slate-700 py-1 px-2 rounded-md transition-colors"
            onClick={() => setIsModalOpen(true)}
          >
            <i className="ri-add-fill mr-1"></i>
            <p>Add collaborator</p>
          </button>
          <button
            onClick={() => setSidePanel(!sidePanel)}
            className="p-2 hover:bg-slate-700 rounded-full transition-colors"
          >
            <i className="ri-group-fill"></i>
          </button>
        </header>

        <div className="conversation-area pt-14 pb-16 flex-grow flex flex-col h-full relative">
          <div
            ref={messageBox}
            className="message-box p-3 flex-grow flex flex-col gap-3 overflow-auto max-h-full scrollbar-hide"
          >
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-10 italic">
                No messages yet. Start a conversation!
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`${
                  msg.sender._id === "AI" ? "max-w-80" : "max-w-60"
                } ${
                  msg.sender._id == user._id.toString() ? "ml-auto" : "mr-auto"
                }  
                    message flex flex-col p-3 ${
                      msg.sender._id == user._id.toString()
                        ? "bg-blue-50 border-l-4 border-blue-500"
                        : msg.sender._id === "AI"
                        ? "bg-gray-50 border-l-4 border-purple-500"
                        : "bg-gray-50 border-l-4 border-gray-500"
                    } w-fit rounded-md shadow-sm transition-all hover:shadow-md`}
              >
                <small className="opacity-75 text-xs font-semibold text-gray-600 mb-1">
                  {msg.sender.email}
                </small>
                <div className="text-sm">
                  {
                    <div>
                      {msg.sender._id === "AI" ? (
                        WriteAiMessage(msg.message)
                      ) : (
                        <p className="break-words">{msg.message}</p>
                      )}
                    </div>
                  }
                </div>
                <small className="text-right text-xs text-gray-400 mt-1">
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
              </div>
            ))}
          </div>

          <div className="inputfield w-full flex absolute bottom-0 p-3 bg-white shadow-md">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="p-3 px-4 border border-gray-300 rounded-l-md outline-none flex-grow focus:border-blue-500 transition-colors"
              type="text"
              placeholder="Type your message..."
            />
            <button
              onClick={send}
              disabled={!message.trim()}
              className={`px-5 ${
                message.trim()
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-400 cursor-not-allowed"
              } flex items-center justify-center text-white rounded-r-md transition-colors`}
            >
              <i className="ri-send-plane-fill"></i>
            </button>
          </div>
        </div>

        <div
          className={`sidepanel w-full h-full absolute top-0 flex flex-col gap-2 transition-all duration-300 ${
            sidePanel ? "-translate-x-0" : "translate-x-full"
          } bg-white shadow-lg z-20`}
        >
          <header className="flex justify-between items-center p-3 px-4 bg-slate-800 text-white shadow-md">
            <h1 className="text-lg font-semibold">Collaborators</h1>
            <button
              onClick={() => {
                setSidePanel(false);
              }}
              className="p-2 hover:bg-slate-700 rounded-full transition-colors"
            >
              <i className="text-2xl ri-close-fill"></i>
            </button>
          </header>

          <div className="users flex flex-col gap-3 p-3 overflow-auto">
            {project.users && project.users.length > 0 ? (
              project.users.map((user, index) => {
                return (
                  <div
                    key={index}
                    className="user cursor-pointer flex gap-3 p-3 hover:bg-gray-100 rounded-lg transition-colors items-center border-b border-gray-100"
                  >
                    <div className="aspect-square rounded-full p-5 text-white w-fit h-fit flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 shadow-sm">
                      <i className="ri-user-fill absolute"></i>
                    </div>
                    <div>
                      <h1 className="text-lg font-semibold">{user.email}</h1>
                      <span className="text-xs text-gray-500">
                        Active collaborator
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-500 mt-10 italic">
                No collaborators yet. Add some!
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="right flex-grow bg-gray-50 h-full flex shadow-inner">
        <div className="explorer h-full max-w-64 min-w-52 bg-slate-800 text-white shadow-md overflow-y-auto">
          <div className="file-tree w-full">
            <h1 className="font-bold text-center py-3 bg-slate-900 sticky top-0 z-10">
              Project Files
            </h1>
            {fileTree && Object.keys(fileTree || {})?.length > 0 ? (
              Object.keys(fileTree)?.map((file, index) => {
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setcurrentFile(file);
                      setopenFiles([...new Set([...openFiles, file])]);
                    }}
                    className={`tree-element w-full cursor-pointer p-3 px-4 flex items-center gap-2 hover:bg-slate-700 transition-colors ${
                      currentFile === file
                        ? "bg-slate-700 border-l-4 border-blue-500"
                        : ""
                    }`}
                  >
                    <i
                      className={`ri-file-${
                        file.endsWith(".js")
                          ? "code"
                          : file.endsWith(".html")
                          ? "html"
                          : file.endsWith(".css")
                          ? "css"
                          : "text"
                      }-line mr-2`}
                    ></i>
                    <p className="font-medium text-sm truncate">{file}</p>
                  </button>
                );
              })
            ) : (
              <div className="text-center text-gray-400 p-5 italic">
                No files available
              </div>
            )}
          </div>
        </div>

        <div className="code-editor flex flex-col flex-grow h-full shrink overflow-hidden">
          <div className="top flex justify-between w-full bg-gray-100 shadow-sm">
            <div className="files flex overflow-x-auto">
              {openFiles.map((file, index) => (
                <button
                  key={index}
                  onClick={() => setcurrentFile(file)}
                  className={`open-file cursor-pointer p-2 px-4 flex items-center gap-2 ${
                    currentFile === file
                      ? "bg-slate-800 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  } transition-colors border-r border-gray-300`}
                >
                  <i
                    className={`ri-file-${
                      file.endsWith(".js")
                        ? "code"
                        : file.endsWith(".html")
                        ? "html"
                        : file.endsWith(".css")
                        ? "css"
                        : "text"
                    }-line`}
                  ></i>
                  <p className="font-medium text-sm">{file}</p>
                  {currentFile === file && (
                    <i
                      className="ri-close-line ml-2 hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newOpenFiles = openFiles.filter(
                          (f) => f !== file
                        );
                        setopenFiles(newOpenFiles);
                        if (currentFile === file) {
                          setcurrentFile(
                            newOpenFiles.length > 0 ? newOpenFiles[0] : null
                          );
                        }
                      }}
                    ></i>
                  )}
                </button>
              ))}
            </div>

            <div className="actions flex gap-2 p-1">
              <button
                onClick={runProject}
                className="p-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center gap-2 shadow-sm"
              >
                <i className="ri-play-fill"></i> Run
              </button>
            </div>
          </div>

          <div className="bottom flex flex-grow max-w-full shrink overflow-auto">
            {fileTree && fileTree[currentFile] ? (
              <div className="code-editor-area h-full overflow-auto flex-grow bg-slate-900 shadow-inner">
                <pre className="hljs h-full">
                  <code
                    className="hljs h-full outline-none p-4"
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
                        currentFile.endsWith(".js")
                          ? "javascript"
                          : currentFile.endsWith(".html")
                          ? "html"
                          : currentFile.endsWith(".css")
                          ? "css"
                          : "javascript",
                        fileTree[currentFile].file.contents
                      ).value,
                    }}
                    style={{
                      whiteSpace: "pre-wrap",
                      paddingBottom: "25rem",
                      counterSet: "line-numbering",
                      fontFamily: "monospace",
                    }}
                  />
                </pre>
              </div>
            ) : (
              <div className="flex-grow flex items-center justify-center bg-gray-50 text-gray-400">
                <div className="text-center">
                  <i className="ri-file-list-line text-5xl mb-3"></i>
                  <p>Select a file to edit</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {iframeUrl && webContainer && (
          <div
            className={`flex flex-col border-l border-gray-300 shadow-md transition-all duration-300 ${
              isFullScreen ? "fixed inset-0 z-50 bg-white" : "min-w-96 h-full"
            }`}
          >
            <div className="address-bar bg-gray-100 border-b border-gray-300 p-2 flex items-center">
              <i className="ri-global-line mx-2 text-gray-500"></i>
              <input
                type="text"
                onChange={(e) => setIframeUrl(e.target.value)}
                value={iframeUrl}
                className="w-full p-2 px-3 bg-white border border-gray-300 rounded text-sm"
              />
              <button
                className="ml-2 p-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                onClick={() => {
                  // Refresh iframe
                  const iframe = document.querySelector("iframe");
                  if (iframe) {
                    iframe.src = iframeUrl;
                  }
                }}
              >
                <i className="ri-refresh-line"></i>
              </button>
              <button
                className="ml-2 p-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                onClick={() => setIsFullScreen(!isFullScreen)}
                title={isFullScreen ? "Zoom out" : "Zoom in"}
              >
                <i
                  className={`ri-${isFullScreen ? "zoom-out" : "zoom-in"}-line`}
                ></i>
              </button>
              <button
                className="ml-2 p-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                onClick={() => setIframeUrl(null)}
                title="Close preview"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="bg-white flex-grow">
              <iframe
                src={iframeUrl}
                className="w-full h-full border-none"
              ></iframe>
            </div>
          </div>
        )}
      </section>

      {/* Add Collaborator Modal with improved design */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 transform transition-transform duration-300 scale-100">
            <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold flex items-center">
                  <i className="ri-user-add-line mr-2 text-blue-600"></i>
                  Add Collaborator
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>

            {/* Users List with better styling */}
            <div className="max-h-96 overflow-y-auto p-4">
              {users.length > 0 ? (
                users.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => handleUserClick(user._id)}
                    className={`p-3 mb-3 rounded-md cursor-pointer transition-all duration-200 ${
                      Array.from(selectedUser).indexOf(user._id) != -1
                        ? "bg-blue-50 border-l-4 border-blue-500 shadow-md"
                        : "hover:bg-gray-50 border-l-4 border-transparent"
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 text-white rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-lg font-bold">
                          {user.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">
                          {user.email.split("@")[0]}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      {Array.from(selectedUser).indexOf(user._id) != -1 && (
                        <i className="ri-check-line ml-auto text-blue-500 text-xl"></i>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-10">
                  <i className="ri-user-search-line text-4xl mb-2"></i>
                  <p>No users found</p>
                </div>
              )}
            </div>

            {/* Action Buttons with improved styling */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addtoCollaborators}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md transition-colors flex items-center ${
                    selectedUser.size > 0
                      ? "hover:bg-blue-700"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                  disabled={selectedUser.size === 0}
                >
                  <i className="ri-user-add-line mr-2"></i>
                  Add {selectedUser.size > 0 ? `(${selectedUser.size})` : ""}
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
