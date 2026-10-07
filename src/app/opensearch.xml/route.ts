export const dynamic = "force-static";

/** OpenSearch 描述文件：让浏览器/工具可以把本站加入搜索栏 */
export function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>ShiQing 时倾</ShortName>
  <Description>搜索时倾论坛的帖子</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Url type="text/html" method="get" template="https://shiqing.site/bbs/search?q={searchTerms}"/>
</OpenSearchDescription>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/opensearchdescription+xml; charset=utf-8",
    },
  });
}
