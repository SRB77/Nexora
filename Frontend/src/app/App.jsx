import "./App.css";
import { Editor } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { useRef, useMemo, useState, useEffect } from "react";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";

function App() {
  const editorRef = useRef(null);
  const [userName, setUserName] = useState(() => {
    return new URLSearchParams(window.location.search).get("username") || "";
  });
  const [users, setUsers] = useState([]);
  const [isEditorMounted, setIsEditorMounted] = useState(false);
  const ydoc = useMemo(() => new Y.Doc(), []);
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc]);
  const handleMount = (editor) => {
    editorRef.current = editor;
    setIsEditorMounted(true);
  };
  const handleJoin = (e) => {
    e.preventDefault();
    setUserName(e.target.username.value);
    window.history.pushState({}, "", "?username=" + e.target.username.value);
  };

  useEffect(() => {
    if (userName && isEditorMounted && editorRef.current) {
      const provider = new SocketIOProvider(
        "http://localhost:3000",
        "monaco",
        ydoc,
        { autoConnect: true },
      );
      provider.awareness.setLocalStateField("user", { userName });
      
      const updateUsers = () => {
        const states = Array.from(provider.awareness.getStates().values());
        setUsers(
          states
            .filter((state) => state.user && state.user.userName)
            .map((state) => state.user),
        );
      };

      updateUsers();
      provider.awareness.on("change", updateUsers);
      function handleBeforeunload() {
        provider.awareness.setLocalStateField("user", null);
      }
      window.addEventListener("beforeunload", handleBeforeunload);
      const monacoBinding = new MonacoBinding(
        yText,
        editorRef.current.getModel(),
        new Set([editorRef.current]),
        provider.awareness,
      );
      return () => {
        monacoBinding.destroy();
        provider.disconnect();
        window.removeEventListener("beforeunload", handleBeforeunload);
      };
    }
  }, [isEditorMounted, userName, ydoc, yText]);

  if (!userName) {
    return (
      <main className="h-screen w-full bg-gray-950 flex gap-4 p-4 items-center justify-center">
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Enter your username"
            className="p-2 rounded-lg bg-gray-300 |text-white"
            name="username"
          ></input>
          <button className="p-2 rounded-lg bg-amber-50 text-gray-950 font-bold">
            Join
          </button>
        </form>
      </main>
    );
  }
  return (
    <main className="h-screen w-full bg-gray-950 flex gap-4 p-4">
      <aside className="h-full w-1/4 bg-amber-50 rounded-lg">
        <h2 className="text-2xl font-bold p-4 border-b border-gray-300">
          Users
        </h2>
        <ul className="p-4">
          {users.map((user, index) => (
            <li key={index} className="p-2 bg-gray-800 text-white rounded mb-2">
              {user.userName}
            </li>
          ))}
        </ul>
      </aside>
      <section className="w-3/4 bg-neutral-800 rounded-lg overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// some comment"
          theme="vs-dark"
          onMount={handleMount}
        />
      </section>
      <form className="bg-blue-400"></form>
    </main>
  );
}

export default App;
