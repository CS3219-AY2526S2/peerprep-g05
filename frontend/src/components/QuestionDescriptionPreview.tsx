import rehypeSanitize from "rehype-sanitize";
import MarkdownPreview from "@uiw/react-markdown-preview";

export function QuestionDescriptionPreview({
  description,
}: {
  description: string;
}) {
  return (
    <MarkdownPreview source={description} rehypePlugins={[rehypeSanitize]} />
  );
}
