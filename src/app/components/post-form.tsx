"use client";

import {
  ChangeEvent,
  MouseEvent,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPost, updatePost, type WritingState } from "@/app/writing-actions";
import { createClient } from "@/lib/supabase/client";

const initialState: WritingState = {};

type WritingContent = {
  id?: string;
  title: string;
  body: string;
  bodyHtml?: string | null;
  discussionQuestion?: string | null;
};

type Props = {
  clubId: string;
  userId: string;
  draftId: string;
  post?: WritingContent;
  draft?: WritingContent;
};

export function PostForm({ clubId, userId, draftId, post, draft }: Props) {
  const initial = post ?? draft;
  const [state, action, pending] = useActionState(
    post ? updatePost : createPost,
    initialState,
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const initialBody = initial?.body ?? "";
  const initialBodyHtml = initial?.bodyHtml || textToHtml(initialBody);
  const [question, setQuestion] = useState(
    initial?.discussionQuestion ?? "",
  );
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >(draft ? "saved" : "idle");
  const [imageMenuOpen, setImageMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [plusTop, setPlusTop] = useState(8);
  const editorRef = useRef<HTMLDivElement>(null);
  const bodyInputRef = useRef<HTMLInputElement>(null);
  const bodyHtmlInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const latestRef = useRef({
    title,
    body: initialBody,
    bodyHtml: initialBodyHtml,
    question,
  });
  const dirtyRef = useRef(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    latestRef.current.title = title;
    latestRef.current.question = question;
  }, [title, question]);

  useEffect(() => {
    if (post) return;

    const saveDraft = async () => {
      if (!dirtyRef.current) return;
      const current = latestRef.current;
      if (!current.title.trim() && !current.body.trim()) return;

      setSaveStatus("saving");
      const { error } = await supabase.from("post_drafts").upsert({
        id: draftId,
        club_id: clubId,
        author_id: userId,
        title: current.title.slice(0, 200),
        body: current.body.slice(0, 50000),
        body_html: current.bodyHtml.slice(0, 200000),
        discussion_question: current.question.trim().slice(0, 300) || null,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        setSaveStatus("error");
        return;
      }

      dirtyRef.current = false;
      setSaveStatus("saved");
    };

    const timer = window.setInterval(saveDraft, 10_000);
    return () => window.clearInterval(timer);
  }, [clubId, draftId, post, supabase, userId]);

  function markChanged() {
    dirtyRef.current = true;
    setSaveStatus("idle");
  }

  function updateEditor() {
    const editor = editorRef.current;
    if (!editor) return;
    const nextBody = editor.innerText.trim();
    const nextBodyHtml = editor.innerHTML;
    latestRef.current.body = nextBody;
    latestRef.current.bodyHtml = nextBodyHtml;
    if (bodyInputRef.current) bodyInputRef.current.value = nextBody;
    if (bodyHtmlInputRef.current) bodyHtmlInputRef.current.value = nextBodyHtml;
    markChanged();
  }

  function rememberSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    selectionRef.current = range.cloneRange();

    const rangeRect = range.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();
    if (rangeRect.height) {
      setPlusTop(Math.max(4, rangeRect.top - editorRect.top));
    }
  }

  function runCommand(
    event: MouseEvent<HTMLButtonElement>,
    command: string,
    value?: string,
  ) {
    event.preventDefault();
    restoreSelection();
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateEditor();
  }

  function restoreSelection() {
    if (!selectionRef.current) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(selectionRef.current);
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("사진은 10MB 이하로 올려주세요.");
      return;
    }

    setUploading(true);
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${draftId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("post-images")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      setUploading(false);
      alert("사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }

    const { data } = supabase.storage.from("post-images").getPublicUrl(path);
    restoreSelection();
    document.execCommand("insertImage", false, data.publicUrl);
    editorRef.current?.focus();
    updateEditor();
    setUploading(false);
    setImageMenuOpen(false);
    event.target.value = "";
  }

  return (
    <form action={action} className="post-form rich-post-form">
      <input type="hidden" name="clubId" value={clubId} />
      <input ref={bodyInputRef} type="hidden" name="body" defaultValue={initialBody} />
      <input ref={bodyHtmlInputRef} type="hidden" name="bodyHtml" defaultValue={initialBodyHtml} />
      {!post && <input type="hidden" name="draftId" value={draftId} />}
      {post && <input type="hidden" name="postId" value={post.id} />}

      <input
        className="title-input"
        name="title"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          markChanged();
        }}
        maxLength={200}
        placeholder="제목"
        required
      />

      <div className="editor-toolbar" aria-label="글 서식">
        <select
          aria-label="글씨 크기"
          defaultValue="3"
          onChange={(event) => {
            restoreSelection();
            document.execCommand("fontSize", false, event.target.value);
            updateEditor();
          }}
        >
          <option value="2">작게</option>
          <option value="3">보통</option>
          <option value="5">크게</option>
          <option value="7">매우 크게</option>
        </select>
        <button type="button" title="왼쪽 정렬" onMouseDown={(event) => runCommand(event, "justifyLeft")}>≡</button>
        <button type="button" title="가운데 정렬" onMouseDown={(event) => runCommand(event, "justifyCenter")}>≣</button>
        <button type="button" title="오른쪽 정렬" onMouseDown={(event) => runCommand(event, "justifyRight")}>≡</button>
        <button type="button" title="굵게" onMouseDown={(event) => runCommand(event, "bold")}><strong>B</strong></button>
        <button type="button" title="기울임" onMouseDown={(event) => runCommand(event, "italic")}><em>I</em></button>
        <button type="button" title="밑줄" onMouseDown={(event) => runCommand(event, "underline")}><u>U</u></button>
        <button type="button" title="취소선" onMouseDown={(event) => runCommand(event, "strikeThrough")}><s>S</s></button>
        <button type="button" className="quote-tool" title="중요선" onMouseDown={(event) => runCommand(event, "formatBlock", "blockquote")}>중요선</button>
      </div>

      <div className="editor-field">
        <button
          type="button"
          className="editor-plus"
          style={{ top: plusTop }}
          aria-label="사진 추가 메뉴"
          onMouseDown={(event) => {
            event.preventDefault();
            rememberSelection();
            setImageMenuOpen((open) => !open);
          }}
        >
          +
        </button>
        {imageMenuOpen && (
          <button
            type="button"
            className="image-add-button"
            style={{ top: plusTop }}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "올리는 중…" : "사진 추가"}
          </button>
        )}
        <input
          ref={fileRef}
          className="file-input"
          type="file"
          accept="image/*"
          onChange={uploadImage}
        />
        <div
          ref={editorRef}
          className="rich-editor"
          contentEditable
          suppressContentEditableWarning
          data-placeholder="지금 떠오르는 생각부터 천천히 적어보세요."
          dangerouslySetInnerHTML={{ __html: initialBodyHtml }}
          onInput={updateEditor}
          onKeyUp={rememberSelection}
          onMouseUp={rememberSelection}
          onFocus={rememberSelection}
        />
      </div>

      <label className="optional-question">
        <textarea
          name="discussionQuestion"
          value={question}
          onChange={(event) => {
            setQuestion(event.target.value);
            markChanged();
          }}
          maxLength={300}
          rows={3}
          placeholder="함께 나누고 싶은 질문"
        />
      </label>

      {!post && (
        <p className={`draft-status ${saveStatus}`} aria-live="polite">
          {saveStatus === "saving" && "임시저장 중…"}
          {saveStatus === "saved" && "임시저장됨"}
          {saveStatus === "error" && "임시저장하지 못했어요."}
          {saveStatus === "idle" && "10초마다 자동으로 임시저장됩니다."}
        </p>
      )}
      {state.error && <p className="error">{state.error}</p>}
      <button className="publish-button" disabled={pending}>
        {pending ? "저장 중…" : post ? "수정 완료" : "글 발행하기"}
      </button>
    </form>
  );
}

function textToHtml(value: string) {
  if (!value) return "";
  return value
    .split("\n")
    .map((line) => `<div>${escapeHtml(line) || "<br>"}</div>`)
    .join("");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
