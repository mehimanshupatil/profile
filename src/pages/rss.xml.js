import rss from "@astrojs/rss";
import { getAllPostSorted } from '../helpers/helper';

export async function GET(context) {
  const posts = (await getAllPostSorted())
  return rss({
    title: "Himanshu Patil | Blog",
    description: "Daily blog posts for working professionals and developers in India — covering tech, workflows, personal finance, and more.",
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.id}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}
