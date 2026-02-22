export function SkeletonPulse({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden shadow-lg">
      <div className="aspect-square bg-gray-200 animate-pulse" />
      <div className="p-4 md:p-6 space-y-3">
        <SkeletonPulse className="h-5 w-3/4" />
        <SkeletonPulse className="h-4 w-1/2" />
        <div className="grid grid-cols-3 gap-2 pt-2">
          <SkeletonPulse className="h-8" />
          <SkeletonPulse className="h-8" />
          <SkeletonPulse className="h-8" />
        </div>
        <SkeletonPulse className="h-4 w-1/3 mx-auto mt-2" />
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-lg p-4 md:p-6 text-center shadow-lg">
      <SkeletonPulse className="h-8 w-16 mx-auto mb-2" />
      <SkeletonPulse className="h-4 w-20 mx-auto" />
    </div>
  );
}

export function SkeletonNewsCard() {
  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden shadow-lg">
      <div className="aspect-video bg-gray-200 animate-pulse" />
      <div className="p-4 md:p-6 space-y-3">
        <SkeletonPulse className="h-5 w-full" />
        <SkeletonPulse className="h-4 w-full" />
        <SkeletonPulse className="h-4 w-2/3" />
        <div className="flex justify-between pt-2">
          <SkeletonPulse className="h-3 w-20" />
          <SkeletonPulse className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonLine({ width = 'w-full' }: { width?: string }) {
  return <SkeletonPulse className={`h-4 ${width}`} />;
}

export function PlayersLoadingSkeleton() {
  return (
    <>
      {/* Stats skeleton */}
      <section className="py-8 md:py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Cards skeleton */}
      <section className="py-8 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function TeamLoadingSkeleton() {
  return (
    <>
      <section className="py-8 md:py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SkeletonPulse className="h-8 w-48 mx-auto mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
        </div>
      </section>
      <section className="py-6 md:py-8 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonPulse key={i} className="h-10 w-24 rounded-lg" />
            ))}
          </div>
        </div>
      </section>
      <section className="py-8 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonNewsCard key={i} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
