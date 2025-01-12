import { Button } from '@bigcommerce/components/button';
import { Field, FieldControl, FieldLabel, Form, FormSubmit } from '@bigcommerce/components/form';
import { Input } from '@bigcommerce/components/input';
import { Select, SelectContent, SelectItem } from '@bigcommerce/components/select';
import { AlertCircle, Loader2 as Spinner } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useReducer } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'react-hot-toast';

import { getShippingCountries } from '~/app/[locale]/(default)/cart/_actions/get-shipping-countries';
import { getCheckout } from '~/client/queries/get-checkout';
import { ExistingResultType } from '~/client/util';
import { cn } from '~/lib/utils';

import { getShippingStates } from '../_actions/get-shipping-states';
import { submitShippingInfo } from '../_actions/submit-shipping-info';

type StatesList = Array<{
  id: number;
  state: string;
  state_abbreviation: string;
  country_id: number;
}>;

interface FormValues {
  country: string;
  states: StatesList | null;
  state: string;
  city: string;
  postcode: string;
}

const SubmitButton = () => {
  const { pending } = useFormStatus();
  const t = useTranslations('Cart.SubmitShippingInfo');

  return (
    <Button className="w-full items-center px-8 py-2" disabled={pending} variant="secondary">
      {pending ? (
        <>
          <Spinner aria-hidden="true" className="animate-spin" />
          <span className="sr-only">{t('spinnerText')}</span>
        </>
      ) : (
        <span>{t('submitText')}</span>
      )}
    </Button>
  );
};

export const ShippingInfo = ({
  checkout,
  shippingCountries,
  isVisible,
  hideShippingOptions,
}: {
  checkout: ExistingResultType<typeof getCheckout>;
  shippingCountries: ExistingResultType<typeof getShippingCountries>;
  isVisible: boolean;
  hideShippingOptions: () => void;
}) => {
  const t = useTranslations('Cart.ShippingInfo');

  const shippingConsignment =
    checkout.shippingConsignments?.find((consignment) => consignment.selectedShippingOption) ||
    checkout.shippingConsignments?.[0];

  const selectedShippingCountry = shippingCountries.find(
    (country) => country.countryCode === shippingConsignment?.address.countryCode,
  );

  const [formValues, setFormValues] = useReducer(
    (currentValues: FormValues, newValues: Partial<FormValues>) => ({
      ...currentValues,
      ...newValues,
    }),
    {
      country: selectedShippingCountry
        ? `${selectedShippingCountry.countryCode}-${selectedShippingCountry.id}`
        : '',
      states: [],
      state: shippingConsignment?.address.stateOrProvince || '',
      city: shippingConsignment?.address.city || '',
      postcode: shippingConsignment?.address.postalCode || '',
    },
  );

  useEffect(() => {
    if (formValues.country) {
      const countryId = formValues.country.split('-')[1];

      const fetchStates = async () => {
        const { status, data } = await getShippingStates(Number(countryId));

        if (status === 'success' && data) {
          setFormValues({ states: data });
        } else {
          setFormValues({ states: null });
        }
      };

      if (countryId) {
        void fetchStates();
      }
    }
  }, [formValues.country, t]);

  const onSubmit = async (formData: FormData) => {
    const { status } = await submitShippingInfo(formData, {
      checkoutId: checkout.entityId,
      lineItems:
        checkout.cart?.lineItems.physicalItems.map((item) => ({
          lineItemEntityId: item.entityId,
          quantity: item.quantity,
        })) || [],
      shippingId: shippingConsignment?.entityId ?? '',
    });

    if (status === 'error') {
      toast.error(t('errorMessage'), {
        icon: <AlertCircle className="text-error-secondary" />,
      });
    }
  };

  const resetFormFieldsOnCountryChange = () => {
    if (formValues.country) {
      setFormValues({
        states: [],
        state: '',
        city: '',
        postcode: '',
      });

      hideShippingOptions();
    }
  };

  return (
    <Form
      action={onSubmit}
      className={cn('mx-auto mb-4 mt-4 hidden w-full grid-cols-1 gap-y-4', isVisible && 'grid')}
    >
      <>
        <Field className="relative space-y-2" name="country">
          <FieldLabel>{t('country')}</FieldLabel>
          <FieldControl asChild>
            <Select
              autoComplete="country"
              onValueChange={(value: string) => {
                const countryId = value.split('-')[1];

                if (countryId) {
                  setFormValues({ country: value });
                } else {
                  setFormValues({ country: '' });
                }

                resetFormFieldsOnCountryChange();
              }}
              placeholder={t('countryPlaceholder')}
              value={formValues.country}
            >
              <SelectContent>
                {shippingCountries.map(({ id, countryCode, name }) => {
                  return (
                    <SelectItem key={id} value={`${countryCode}-${id}`}>
                      {name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </FieldControl>
        </Field>
        <Field className="relative space-y-2" name="state">
          <FieldLabel>{t('state')}</FieldLabel>
          <FieldControl asChild>
            {formValues.states !== null ? (
              <Select
                disabled={formValues.states.length === 0}
                onValueChange={(value) => setFormValues({ state: value })}
                placeholder={t('statePlaceholder')}
                value={formValues.state}
              >
                <SelectContent>
                  {formValues.states.map(({ id, state }) => {
                    return (
                      <SelectItem key={id} value={state}>
                        {state}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <Input
                autoComplete="address-level1"
                onChange={(e) => setFormValues({ state: e.target.value })}
                placeholder={t('statePlaceholder')}
                type="text"
                value={formValues.state}
              />
            )}
          </FieldControl>
        </Field>
        <Field className="relative space-y-2" name="city">
          <FieldLabel htmlFor="city-field">{t('city')}</FieldLabel>
          <FieldControl asChild>
            <Input
              autoComplete="address-level2"
              id="city-field"
              onChange={(e) => setFormValues({ city: e.target.value })}
              placeholder={t('cityPlaceholder')}
              type="text"
              value={formValues.city}
            />
          </FieldControl>
        </Field>
        <Field className="relative space-y-2" name="zip">
          <FieldLabel htmlFor="zip-field">{t('postcode')}</FieldLabel>
          <FieldControl asChild>
            <Input
              autoComplete="postal-code"
              id="zip-field"
              onChange={(e) => setFormValues({ postcode: e.target.value })}
              placeholder={t('postcodePlaceholder')}
              type="text"
              value={formValues.postcode}
            />
          </FieldControl>
        </Field>
      </>
      <FormSubmit asChild>
        <SubmitButton />
      </FormSubmit>
    </Form>
  );
};
