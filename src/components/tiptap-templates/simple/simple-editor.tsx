"use client"

import { useEffect } from "react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"
import { StarterKit } from "@tiptap/starter-kit"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"

import { BoldIcon } from "@/components/tiptap-icons/bold-icon"
import { ItalicIcon } from "@/components/tiptap-icons/italic-icon"
import { SubscriptIcon } from "@/components/tiptap-icons/subscript-icon"
import { SuperscriptIcon } from "@/components/tiptap-icons/superscript-icon"
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/heading-node/heading-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button"
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu"
import { LinkPopover } from "@/components/tiptap-ui/link-popover"
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu"
import { Button } from "@/components/tiptap-ui-primitive/button"
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button"

export interface SimpleEditorProps {
  value: string
  onChange: (value: string) => void
  minHeightClassName?: string
  ariaLabel?: string
}

function FormatButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active: boolean
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      data-active-state={active ? "on" : "off"}
      data-disabled={disabled}
      disabled={disabled}
      role="button"
      tabIndex={-1}
      aria-label={label}
      aria-pressed={active}
      tooltip={label}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

export function SimpleEditor({
  value,
  onChange,
  minHeightClassName = "min-h-32",
  ariaLabel = "Rich text editor",
}: SimpleEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": ariaLabel,
        class: `simple-editor tiptap-editor ${minHeightClassName}`,
      },
    },
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        horizontalRule: false,
        strike: false,
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      Superscript,
      Subscript,
    ],
    content: value || "",
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.isEmpty ? "" : currentEditor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return

    const currentHtml = editor.isEmpty ? "" : editor.getHTML()
    if (currentHtml === (value || "")) return

    editor.commands.setContent(value || "", { emitUpdate: false })
  }, [editor, value])

  return (
    <div className="simple-editor-embedded">
      <EditorContext.Provider value={{ editor }}>
        <Toolbar>
          <ToolbarGroup>
            <UndoRedoButton action="undo" />
            <UndoRedoButton action="redo" />
          </ToolbarGroup>

          <ToolbarSeparator />

          <ToolbarGroup>
            <HeadingDropdownMenu modal={false} levels={[1, 2, 3, 4, 5, 6]} />
            <ListDropdownMenu
              modal={false}
              types={["bulletList", "orderedList"]}
            />
            <CodeBlockButton />
          </ToolbarGroup>

          <ToolbarSeparator />

          <ToolbarGroup>
            <FormatButton
              label="Bold"
              active={editor?.isActive("bold") ?? false}
              disabled={!(editor?.can().chain().focus().toggleBold().run() ?? false)}
              onClick={() => {
                editor?.chain().focus().toggleBold().run()
              }}
            >
              <BoldIcon className="tiptap-button-icon" />
            </FormatButton>
            <FormatButton
              label="Italic"
              active={editor?.isActive("italic") ?? false}
              disabled={!(editor?.can().chain().focus().toggleItalic().run() ?? false)}
              onClick={() => {
                editor?.chain().focus().toggleItalic().run()
              }}
            >
              <ItalicIcon className="tiptap-button-icon" />
            </FormatButton>
            <FormatButton
              label="Subscript"
              active={editor?.isActive("subscript") ?? false}
              disabled={
                !(editor?.can().chain().focus().toggleMark("subscript").run() ?? false)
              }
              onClick={() => {
                editor?.chain().focus().toggleMark("subscript").run()
              }}
            >
              <SubscriptIcon className="tiptap-button-icon" />
            </FormatButton>
            <FormatButton
              label="Superscript"
              active={editor?.isActive("superscript") ?? false}
              disabled={
                !(editor?.can().chain().focus().toggleMark("superscript").run() ?? false)
              }
              onClick={() => {
                editor?.chain().focus().toggleMark("superscript").run()
              }}
            >
              <SuperscriptIcon className="tiptap-button-icon" />
            </FormatButton>
            <LinkPopover autoOpenOnLinkActive={false} />
          </ToolbarGroup>
        </Toolbar>

        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
      </EditorContext.Provider>
    </div>
  )
}
