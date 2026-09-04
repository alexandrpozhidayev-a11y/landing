<?php

namespace App\Http\Controllers;

use App\Models\FaqItem;
use Illuminate\Http\Request;

class FaqItemController extends Controller
{
    public function index()
    {
        $items = FaqItem::orderBy('sort_order')->orderBy('id')->paginate(20);

        return view('faq.index', compact('items'));
    }

    public function create()
    {
        return view('faq.create');
    }

    public function store(Request $request)
    {
        FaqItem::create($this->validated($request));

        return redirect()->route('faq.index')->with('status', 'FAQ item created.');
    }

    public function edit(FaqItem $faq)
    {
        return view('faq.edit', ['item' => $faq]);
    }

    public function update(Request $request, FaqItem $faq)
    {
        $faq->update($this->validated($request));

        return redirect()->route('faq.index')->with('status', 'FAQ item updated.');
    }

    public function destroy(FaqItem $faq)
    {
        $faq->delete();

        return redirect()->route('faq.index')->with('status', 'FAQ item deleted.');
    }

    private function validated(Request $request): array
    {
        $validated = $request->validate([
            'question' => ['required', 'string', 'max:255'],
            'answer' => ['nullable', 'string'],
            'list_items' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        $validated['sort_order'] = $validated['sort_order'] ?? 0;

        return $validated;
    }
}
