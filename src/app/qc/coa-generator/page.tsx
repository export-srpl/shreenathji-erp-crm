import { CoaGeneratorForm } from '@/components/qc/coa-generator-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CoaGeneratorPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight font-headline">AI-Powered COA Generator</h1>
        <p className="text-muted-foreground">
          Enter product details to automatically generate a Certificate of Analysis.
        </p>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Product & Batch Information</CardTitle>
          <CardDescription>
            Provide the necessary details for the COA. The AI will format the document and add relevant safety disclaimers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CoaGeneratorForm />
        </CardContent>
      </Card>
    </div>
  );
}
