'use client';

import { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, GripVertical, Save, X, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

type PipelineStage = {
  id?: string;
  name: string;
  order: number;
  stageType: 'open' | 'won' | 'lost';
  isMandatory: boolean;
  isTerminal: boolean;
  color?: string;
};

type DealPipeline = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  stages: PipelineStage[];
  _count?: { deals: number };
};

type LeadStage = {
  id: string;
  name: string;
  order: number;
  stageType: 'active' | 'converted' | 'disqualified';
  color: string | null;
  isActive: boolean;
  _count?: { leads: number };
};

type LeadSource = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count?: { leads: number };
};

type Label = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  isActive: boolean;
};

function WorkflowConfigContent() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('pipelines');
  
  // Deal Pipelines
  const [pipelines, setPipelines] = useState<DealPipeline[]>([]);
  const [pipelineDialogOpen, setPipelineDialogOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<DealPipeline | null>(null);
  
  // Lead Stages
  const [leadStages, setLeadStages] = useState<LeadStage[]>([]);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<LeadStage | null>(null);
  
  // Lead Sources
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<LeadSource | null>(null);
  
  // Labels
  const [labels, setLabels] = useState<Label[]>([]);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    await Promise.all([
      fetchPipelines(),
      fetchLeadStages(),
      fetchLeadSources(),
      fetchLabels(),
    ]);
  };

  const fetchPipelines = async () => {
    try {
      const res = await fetch('/api/workflow-config/deal-pipelines');
      if (res.ok) {
        const data = await res.json();
        setPipelines(data);
      }
    } catch (error) {
      console.error('Failed to fetch pipelines:', error);
    }
  };

  const fetchLeadStages = async () => {
    try {
      const res = await fetch('/api/workflow-config/lead-stages');
      if (res.ok) {
        const data = await res.json();
        setLeadStages(data);
      }
    } catch (error) {
      console.error('Failed to fetch lead stages:', error);
    }
  };

  const fetchLeadSources = async () => {
    try {
      const res = await fetch('/api/workflow-config/lead-sources');
      if (res.ok) {
        const data = await res.json();
        setLeadSources(data);
      }
    } catch (error) {
      console.error('Failed to fetch lead sources:', error);
    }
  };

  const fetchLabels = async () => {
    try {
      const res = await fetch('/api/workflow-config/labels');
      if (res.ok) {
        const data = await res.json();
        setLabels(data);
      }
    } catch (error) {
      console.error('Failed to fetch labels:', error);
    }
  };

  const handleDeletePipeline = async (id: string) => {
    try {
      const res = await fetch(`/api/workflow-config/deal-pipelines/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete pipeline');
      }
      toast({
        title: 'Pipeline deleted',
        description: 'The pipeline has been deleted successfully.',
      });
      fetchPipelines();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete pipeline.',
      });
    }
  };

  const handleDeleteStage = async (id: string) => {
    try {
      const res = await fetch(`/api/workflow-config/lead-stages/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete stage');
      }
      toast({
        title: 'Stage deleted',
        description: 'The stage has been deleted successfully.',
      });
      fetchLeadStages();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete stage.',
      });
    }
  };

  const handleDeleteSource = async (id: string) => {
    try {
      const res = await fetch(`/api/workflow-config/lead-sources/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete source');
      }
      toast({
        title: 'Source deleted',
        description: 'The source has been deleted successfully.',
      });
      fetchLeadSources();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete source.',
      });
    }
  };

  const handleDeleteLabel = async (id: string) => {
    try {
      const res = await fetch(`/api/workflow-config/labels/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete label');
      }
      toast({
        title: 'Label deleted',
        description: 'The label has been deleted successfully.',
      });
      fetchLabels();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete label.',
      });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Workflow Configuration</h1>
        <p className="text-muted-foreground">
          Manage deal pipelines, lead stages, lead sources, and labels used across the CRM.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="pipelines">Deal Pipelines</TabsTrigger>
          <TabsTrigger value="lead-stages">Lead Stages</TabsTrigger>
          <TabsTrigger value="lead-sources">Lead Sources</TabsTrigger>
          <TabsTrigger value="labels">Labels</TabsTrigger>
        </TabsList>

        {/* Deal Pipelines Tab */}
        <TabsContent value="pipelines" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Configure deal pipelines with custom stages, ordering, and status types.
            </p>
            <Dialog open={pipelineDialogOpen} onOpenChange={setPipelineDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingPipeline(null)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Pipeline
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <PipelineDialog
                  pipeline={editingPipeline}
                  onClose={() => {
                    setPipelineDialogOpen(false);
                    setEditingPipeline(null);
                  }}
                  onSave={() => {
                    fetchPipelines();
                    setPipelineDialogOpen(false);
                    setEditingPipeline(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {pipelines.map((pipeline) => (
              <Card key={pipeline.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {pipeline.name}
                        {pipeline.isDefault && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                            Default
                          </span>
                        )}
                        {!pipeline.isActive && (
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            Inactive
                          </span>
                        )}
                      </CardTitle>
                      {pipeline.description && (
                        <CardDescription>{pipeline.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingPipeline(pipeline);
                          setPipelineDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete pipeline "${pipeline.name}"? This cannot be undone.`)) {
                            handleDeletePipeline(pipeline.id);
                          }
                        }}
                        disabled={pipeline.isDefault || (pipeline._count?.deals || 0) > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {pipeline.stages.length} stage(s) • {pipeline._count?.deals || 0} deal(s) using this pipeline
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {pipeline.stages.map((stage, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-1 rounded text-sm border"
                          style={{
                            borderColor: stage.color || '#e5e7eb',
                            backgroundColor: stage.color ? `${stage.color}20` : '#f9fafb',
                          }}
                        >
                          {stage.name} ({stage.stageType})
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Lead Stages Tab */}
        <TabsContent value="lead-stages" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Manage lead stages and their order. Changes won't affect existing lead data.
            </p>
            <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingStage(null)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Stage
                </Button>
              </DialogTrigger>
              <DialogContent>
                <LeadStageDialog
                  stage={editingStage}
                  existingStages={leadStages}
                  onClose={() => {
                    setStageDialogOpen(false);
                    setEditingStage(null);
                  }}
                  onSave={() => {
                    fetchLeadStages();
                    setStageDialogOpen(false);
                    setEditingStage(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {leadStages.map((stage) => (
              <Card key={stage.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: stage.color || '#e5e7eb' }}
                      />
                      <div>
                        <p className="font-medium">{stage.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {stage.stageType} • Order: {stage.order} • {stage._count?.leads || 0} lead(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingStage(stage);
                          setStageDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete stage "${stage.name}"?`)) {
                            handleDeleteStage(stage.id);
                          }
                        }}
                        disabled={(stage._count?.leads || 0) > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Lead Sources Tab */}
        <TabsContent value="lead-sources" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Manage lead sources. Deactivating won't affect historical data.
            </p>
            <Dialog open={sourceDialogOpen} onOpenChange={setSourceDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingSource(null)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Source
                </Button>
              </DialogTrigger>
              <DialogContent>
                <LeadSourceDialog
                  source={editingSource}
                  existingSources={leadSources}
                  onClose={() => {
                    setSourceDialogOpen(false);
                    setEditingSource(null);
                  }}
                  onSave={() => {
                    fetchLeadSources();
                    setSourceDialogOpen(false);
                    setEditingSource(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {leadSources.map((source) => (
              <Card key={source.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{source.name}</p>
                      {source.description && (
                        <p className="text-sm text-muted-foreground">{source.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {source._count?.leads || 0} lead(s)
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingSource(source);
                          setSourceDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete source "${source.name}"?`)) {
                            handleDeleteSource(source.id);
                          }
                        }}
                        disabled={(source._count?.leads || 0) > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Labels Tab */}
        <TabsContent value="labels" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Create color-coded labels for segmentation and filtering.
            </p>
            <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingLabel(null)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Label
                </Button>
              </DialogTrigger>
              <DialogContent>
                <LabelDialog
                  label={editingLabel}
                  onClose={() => {
                    setLabelDialogOpen(false);
                    setEditingLabel(null);
                  }}
                  onSave={() => {
                    fetchLabels();
                    setLabelDialogOpen(false);
                    setEditingLabel(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {labels.map((label) => (
              <Card key={label.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: label.color }}
                      />
                      <div>
                        <p className="font-medium">{label.name}</p>
                        {label.description && (
                          <p className="text-sm text-muted-foreground">{label.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingLabel(label);
                          setLabelDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete label "${label.name}"?`)) {
                            handleDeleteLabel(label.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Pipeline Dialog Component
function PipelineDialog({
  pipeline,
  onClose,
  onSave,
}: {
  pipeline: DealPipeline | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [stages, setStages] = useState<PipelineStage[]>([]);

  useEffect(() => {
    if (pipeline) {
      setName(pipeline.name);
      setDescription(pipeline.description || '');
      setIsDefault(pipeline.isDefault);
      setIsActive(pipeline.isActive);
      setStages(pipeline.stages.map(s => ({ ...s })));
    } else {
      setName('');
      setDescription('');
      setIsDefault(false);
      setIsActive(true);
      setStages([{
        name: 'Prospecting',
        order: 0,
        stageType: 'open',
        isMandatory: false,
        isTerminal: false,
      }]);
    }
  }, [pipeline]);

  const addStage = () => {
    setStages([
      ...stages,
      {
        name: `Stage ${stages.length + 1}`,
        order: stages.length,
        stageType: 'open',
        isMandatory: false,
        isTerminal: false,
      },
    ]);
  };

  const removeStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })));
  };

  const updateStage = (index: number, updates: Partial<PipelineStage>) => {
    const newStages = [...stages];
    newStages[index] = { ...newStages[index], ...updates };
    setStages(newStages);
  };

  const moveStage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stages.length - 1) return;

    const newStages = [...stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
    newStages.forEach((s, i) => (s.order = i));
    setStages(newStages);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Pipeline name is required.',
      });
      return;
    }

    if (stages.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'At least one stage is required.',
      });
      return;
    }

    try {
      const url = pipeline
        ? `/api/workflow-config/deal-pipelines/${pipeline.id}`
        : '/api/workflow-config/deal-pipelines';
      const method = pipeline ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          isDefault,
          isActive,
          stages: stages.map((s, i) => ({ ...s, order: i })),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save pipeline');
      }

      toast({
        title: 'Pipeline saved',
        description: 'The pipeline has been saved successfully.',
      });

      onSave();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save pipeline.',
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{pipeline ? 'Edit Pipeline' : 'Create Pipeline'}</DialogTitle>
        <DialogDescription>
          Configure deal pipeline stages, ordering, and status types.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label>Pipeline Name *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Standard Sales Pipeline"
          />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this pipeline..."
            rows={2}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label>Set as Default</Label>
          <Switch checked={isDefault} onCheckedChange={setIsDefault} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <Separator />

        <div>
          <div className="flex justify-between items-center mb-2">
            <Label>Stages *</Label>
            <Button type="button" variant="outline" size="sm" onClick={addStage}>
              <Plus className="mr-2 h-4 w-4" />
              Add Stage
            </Button>
          </div>
          <div className="space-y-2">
            {stages.map((stage, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Input
                        value={stage.name}
                        onChange={(e) => updateStage(index, { name: e.target.value })}
                        placeholder="Stage name"
                        className="flex-1"
                      />
                      <Select
                        value={stage.stageType}
                        onValueChange={(value: 'open' | 'won' | 'lost') =>
                          updateStage(index, { stageType: value })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="won">Won</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveStage(index, 'up')}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => moveStage(index, 'down')}
                        disabled={index === stages.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeStage(index)}
                        disabled={stages.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={stage.isMandatory}
                          onCheckedChange={(checked) =>
                            updateStage(index, { isMandatory: checked })
                          }
                        />
                        <Label className="text-xs">Mandatory</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={stage.isTerminal}
                          onCheckedChange={(checked) =>
                            updateStage(index, { isTerminal: checked })
                          }
                        />
                        <Label className="text-xs">Terminal</Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>
    </>
  );
}

// Lead Stage Dialog Component
function LeadStageDialog({
  stage,
  existingStages,
  onClose,
  onSave,
}: {
  stage: LeadStage | null;
  existingStages: LeadStage[];
  onClose: () => void;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [order, setOrder] = useState(0);
  const [stageType, setStageType] = useState<'active' | 'converted' | 'disqualified'>('active');
  const [color, setColor] = useState('#3b82f6');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (stage) {
      setName(stage.name);
      setOrder(stage.order);
      setStageType(stage.stageType);
      setColor(stage.color || '#3b82f6');
      setIsActive(stage.isActive);
    } else {
      const maxOrder = Math.max(...existingStages.map(s => s.order), -1) + 1;
      setName('');
      setOrder(maxOrder);
      setStageType('active');
      setColor('#3b82f6');
      setIsActive(true);
    }
  }, [stage, existingStages]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Stage name is required.',
      });
      return;
    }

    try {
      const url = stage
        ? `/api/workflow-config/lead-stages/${stage.id}`
        : '/api/workflow-config/lead-stages';
      const method = stage ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          order,
          stageType,
          color,
          isActive,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save stage');
      }

      toast({
        title: 'Stage saved',
        description: 'The stage has been saved successfully.',
      });

      onSave();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save stage.',
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{stage ? 'Edit Lead Stage' : 'Create Lead Stage'}</DialogTitle>
        <DialogDescription>
          Configure lead stage name, type, and order.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label>Stage Name *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Qualified"
          />
        </div>
        <div>
          <Label>Order</Label>
          <Input
            type="number"
            value={order}
            onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label>Stage Type</Label>
          <Select value={stageType} onValueChange={(v: any) => setStageType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="disqualified">Disqualified</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-20 h-10"
            />
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#3b82f6"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>
    </>
  );
}

// Lead Source Dialog Component
function LeadSourceDialog({
  source,
  existingSources,
  onClose,
  onSave,
}: {
  source: LeadSource | null;
  existingSources: LeadSource[];
  onClose: () => void;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (source) {
      setName(source.name);
      setDescription(source.description || '');
      setIsActive(source.isActive);
    } else {
      setName('');
      setDescription('');
      setIsActive(true);
    }
  }, [source]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Source name is required.',
      });
      return;
    }

    try {
      const url = source
        ? `/api/workflow-config/lead-sources/${source.id}`
        : '/api/workflow-config/lead-sources';
      const method = source ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          isActive,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save source');
      }

      toast({
        title: 'Source saved',
        description: 'The source has been saved successfully.',
      });

      onSave();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save source.',
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{source ? 'Edit Lead Source' : 'Create Lead Source'}</DialogTitle>
        <DialogDescription>
          Add or modify lead sources for tracking where leads come from.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label>Source Name *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Website, Referral, Exhibition"
          />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this source..."
            rows={2}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>
    </>
  );
}

// Label Dialog Component
function LabelDialog({
  label,
  onClose,
  onSave,
}: {
  label: Label | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (label) {
      setName(label.name);
      setColor(label.color);
      setDescription(label.description || '');
      setIsActive(label.isActive);
    } else {
      setName('');
      setColor('#3b82f6');
      setDescription('');
      setIsActive(true);
    }
  }, [label]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Label name is required.',
      });
      return;
    }

    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please enter a valid hex color code (e.g., #FF5733).',
      });
      return;
    }

    try {
      const url = label
        ? `/api/workflow-config/labels/${label.id}`
        : '/api/workflow-config/labels';
      const method = label ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          color,
          description,
          isActive,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save label');
      }

      toast({
        title: 'Label saved',
        description: 'The label has been saved successfully.',
      });

      onSave();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save label.',
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{label ? 'Edit Label' : 'Create Label'}</DialogTitle>
        <DialogDescription>
          Create color-coded labels for segmentation and filtering.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <Label>Label Name *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hot Lead, VIP Customer"
          />
        </div>
        <div>
          <Label>Color *</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-20 h-10"
            />
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#3b82f6"
              pattern="^#[0-9A-F]{6}$"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Enter a hex color code (e.g., #FF5733)
          </p>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this label..."
            rows={2}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
      </div>
    </>
  );
}

export default function WorkflowConfigPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <p>Loading...</p>
      </div>
    }>
      <WorkflowConfigContent />
    </Suspense>
  );
}

