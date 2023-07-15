import PostPreview from "../components/post-preview";

export default function MoreStories({ posts }) {
  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-1 lg:gap-x-3 gap-y-2 md:gap-y-2 mb-2 font-mono">
        {posts.map((post) => (
          <PostPreview
            key={post.slug}
            title={post.title}
            //coverImage={post.coverImage}
            date={post.date}
            // author={post.author}
            slug={post.slug}
            excerpt={post.excerpt}
          />
        ))}
      </div>
    </section>
  );
}
