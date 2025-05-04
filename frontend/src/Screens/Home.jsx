import React, { useContext, useState, useEffect } from 'react'
import { UserContext } from '../context/user.context'
import axios from '../config/axios.js'
import { useNavigate } from 'react-router-dom'

const Home = () => {
  const { user } = useContext(UserContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [project, setProject] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get("/projects/all").then((res) => {
      setProject(res.data.projects);
    })
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post("/projects/create", {
      name: projectName
    })
      .then((res) => {
        console.log(res);
        setIsModalOpen(false);
        // Refresh project list after creating a new one
        axios.get("/projects/all").then((res) => {
          setProject(res.data.projects);
        });
        setProjectName('');
      })
      .catch(err => {
        console.log(err);
      })
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">My Projects</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center h-48 bg-white border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 shadow-sm"
          >
            <div className="flex flex-col items-center text-slate-600 hover:text-blue-600">
              <i className="ri-add-line text-3xl mb-2"></i>
              <span className="font-medium">New Project</span>
            </div>
          </button>

          {project.map((project) => (
            console.log(project),
            <div
              key={project._id}
              onClick={() => {
                navigate(`/project`, {
                  state: { project }
                })
              }}
              className="h-48 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
            >
              <div className="bg-blue-600 h-2"></div>
              <div className="p-4 flex-1 flex flex-col">
                <h2 className="text-lg font-semibold text-slate-800 mb-2 truncate">{project.name}</h2>
                <div className="mt-auto">
                  <div className="flex items-center text-slate-500 text-sm">
                    <i className="ri-user-line mr-2"></i>
                    <span>{project.users.length} {project.users.length === 1 ? 'Collaborator' : 'Collaborators'}</span>
                  </div>
                  <div className="flex items-center mt-2 text-slate-400 text-xs">
                    <i className="ri-time-line mr-1"></i>
                    <span>Last edited: Recently</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden transform transition-all">
            <div className="bg-blue-600 h-1"></div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800">Create New Project</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="projectName" className="block text-sm font-medium text-slate-700 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Enter project name"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default Home