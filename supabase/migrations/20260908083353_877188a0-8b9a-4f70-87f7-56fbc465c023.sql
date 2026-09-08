CREATE POLICY "Superadmins can update stock_in" ON public.stock_in FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'superadmin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can update stock_out" ON public.stock_out FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'superadmin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

GRANT UPDATE ON public.stock_in TO authenticated;
GRANT UPDATE ON public.stock_out TO authenticated;