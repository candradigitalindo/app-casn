'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Proposal, money } from '@/lib/api/projects';
import { FeaturePage, QueryStatus } from '@/components/feature-page';
import { Button } from '@/components/ui/button';
function ProposalPage() {
  const params = useSearchParams();
  const id = params.get('id');
  const version = params.get('version');
  const query = useQuery({
    queryKey: ['projects', id, 'proposal', version],
    queryFn: () =>
      apiClient.get<Proposal>(`/api/v1/projects/${id}/proposals/${version}`),
    enabled: !!id && !!version,
  });
  const proposal = query.data?.data;
  const project = proposal?.snapshot;
  return (
    <FeaturePage title="Dokumen penawaran">
      <div className="flex gap-3 print:hidden">
        <Link className="text-primary" href={`/projects/detail?id=${id}`}>
          ← Kembali
        </Link>
        <Button disabled={!proposal} onClick={() => window.print()}>
          Cetak / simpan PDF
        </Button>
      </div>
      <QueryStatus
        loading={query.isLoading}
        error={query.isError}
        retry={() => query.refetch()}
      />
      {project && proposal && (
        <article className="bg-white border rounded-xl p-6 md:p-10 space-y-6 print:border-0 print:p-0">
          <div>
            <p className="text-sm">
              {proposal.documentNumber} · Versi {proposal.version}
            </p>
            <h2 className="font-bold text-2xl mt-2">{project.name}</h2>
            <p>
              {project.agencyName} · Tahun {project.fiscalYear}
            </p>
            <p className="text-sm text-muted-foreground">
              Diajukan{' '}
              {new Date(proposal.createdAt).toLocaleDateString('id-ID')}
            </p>
          </div>
          {project.locations.map((location) => (
            <section key={location.id} className="space-y-3">
              <h3 className="font-semibold">
                {location.name} · {location.city}
              </h3>
              <p className="text-sm">
                Kapasitas {location.capacity} peserta · {location.days} hari
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2">Uraian</th>
                    <th className="p-2">Jumlah</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {location.requirements
                    .filter((req) => req.qty > 0)
                    .map((req) => (
                      <tr key={req.id} className="border-b">
                        <td className="p-2">{req.name}</td>
                        <td className="p-2">
                          {req.qty} {req.unit}
                        </td>
                        <td className="p-2 text-right">
                          {money(req.sellTotal)}
                        </td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th className="p-2 text-right" colSpan={2}>
                      Subtotal lokasi
                    </th>
                    <th className="p-2 text-right">
                      {money(location.sellTotal)}
                    </th>
                  </tr>
                </tfoot>
              </table>
            </section>
          ))}
          <p className="text-right font-bold text-lg">
            Total penawaran {money(proposal.sellTotal)}
          </p>
          <p className="text-xs text-muted-foreground">
            Nilai mengikuti versi penawaran yang diajukan. Ketentuan pajak
            mengikuti dokumen kontrak yang disepakati.
          </p>
        </article>
      )}
    </FeaturePage>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<p className="p-8">Memuat penawaran…</p>}>
      <ProposalPage />
    </Suspense>
  );
}
