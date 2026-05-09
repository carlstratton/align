export async function GET() {
  return Response.json({
    message: "List jobs endpoint scaffolded.",
  });
}

export async function POST() {
  return Response.json(
    { message: "Create job endpoint scaffolded." },
    { status: 201 },
  );
}
