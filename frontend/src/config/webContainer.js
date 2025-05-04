import { WebContainer } from '@webcontainer/api';

let webContainerInstance = null;

export const getWebContainer = async () => {
  // If webContainer is not initialized yet, initialize it
  if (!webContainerInstance) {
    try {
      webContainerInstance = await WebContainer.boot();
    } catch (error) {
      console.error("Error initializing WebContainer:", error);
      throw new Error("WebContainer initialization failed");
    }
  }

  // Return the initialized or reused webContainer instance
  return webContainerInstance;
};
