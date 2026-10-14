export function createDeviceRuntime(adapters: {
  readData: () => Promise<string | null>;
  writeData: (value: string) => Promise<void>;
  removeData: () => Promise<void>;
  readKey: () => Promise<string | null>;
  writeKey: (value: string | null) => Promise<void>;
  newId: () => string;
}): {
  initialize: () => Promise<string | null>;
  request: (path: string, method: string, token?: string, body?: object) => Promise<unknown>;
};
