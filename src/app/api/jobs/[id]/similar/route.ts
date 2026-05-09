type SimilarJobsRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: SimilarJobsRouteProps) {
  const { id } = await params;

  return Response.json({
    sourceJobId: id,
    similarJobs: [],
    message: "Similar jobs endpoint scaffolded.",
  });
}
