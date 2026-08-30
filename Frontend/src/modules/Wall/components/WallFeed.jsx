import React from 'react';
import WallPostCard from './WallPostCard';

export default function WallFeed({ feed, utils, currentUser }) {
  const { loading, posts } = feed;

  return (
    <div className="wall-feed">
      {loading && posts.length === 0 ? (
        <div className="text-center p-12 text-tertiary">
          <div className="animate-pulse">Cargando historias...</div>
        </div>
      ) : !loading && posts.length === 0 ? (
        <div className="text-center p-12 text-tertiary">
          Nadie pidió nacer donde nació.
        </div>
      ) : (
        posts.map((post) => (
          <WallPostCard
            key={post.id}
            post={post}
            feed={feed}
            utils={utils}
            currentUser={currentUser}
          />
        ))
      )}
    </div>
  );
}
