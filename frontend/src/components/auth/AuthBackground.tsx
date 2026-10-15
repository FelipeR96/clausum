export function AuthBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute right-[-5%] top-[-10%] h-[60%] w-[40%] rounded-full bg-primary-container/30 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-5%] h-[50%] w-[30%] rounded-full bg-primary/10 blur-[100px]" />
    </div>
  );
}
